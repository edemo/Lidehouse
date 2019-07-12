import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { autoformOptions } from '/imports/utils/autoform.js';
import { chooseLocalizerNode } from '/imports/api/transactions/breakdowns/localizer.js';
import { Topics } from '/imports/api/topics/topics.js';
// import { readableId } from '/imports/api/readable-id.js';

export const Tickets = {};

Tickets.typeValues = ['issue', 'upgrade', 'maintenance'];
Tickets.urgencyValues = ['high', 'normal', 'low'];
Tickets.urgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};
Tickets.chargeTypeValues = ['oneoff', 'lumpsum', 'warranty'];

Tickets.extensionRawSchema = {
  type: { type: String, allowedValues: Tickets.typeValues, autoform: autoformOptions(Tickets.typeValues, 'schemaTickets.ticket.type.') },
  urgency: { type: String, allowedValues: Tickets.urgencyValues, autoform: autoformOptions(Tickets.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  localizer: { type: String, optional: true, autoform: chooseLocalizerNode },
  partner: { type: String, optional: true },
  chargeType: { type: String, allowedValues: Tickets.chargeTypeValues, autoform: autoformOptions(Tickets.chargeTypeValues, 'schemaTickets.ticket.chargeType.'), optional: true },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true /* TODO: Select from tx list */ },

  expectedCost: { type: Number, decimal: true, optional: true },
  expectedStart: { type: Date, optional: true },
  expectedFinish: { type: Date, optional: true },
  expectedContinue: { type: Date, optional: true },
  waitingFor: { type: String, optional: true },
  actualCost: { type: Number, decimal: true, optional: true },
  actualStart: { type: Date, optional: true },
  actualFinish: { type: Date, optional: true },
  actualContinue: { type: Date, optional: true },

  // readableId: { type: readableId(Topics, 'T', 'ticket'), optional: true },
};

Tickets.extensionSchema = new SimpleSchema(Tickets.extensionRawSchema);
Topics.attachSchema({ ticket: { type: Tickets.extensionSchema, optional: true } });
Tickets.schema = new SimpleSchema([
  Topics.schema,
  { ticket: { type: Tickets.extensionSchema, optional: true } },
]);
Meteor.startup(function attach() {
  Tickets.schema.i18n('schemaTickets');   // translation is different from schemaTopics
});

Tickets.modifiableFields = Topics.modifiableFields.concat(['ticket.localizer', 'ticket.urgency']);

Tickets.publicExtensionFields = { ticket: 1 };
_.extend(Topics.publicFields, Tickets.publicExtensionFields);

// === Ticket statuses

const reported = {
  name: 'reported',
  color: 'warning',
  data: ['urgency'],
};

const confirmed = {
  name: 'confirmed',
  color: 'info',
  data: [
    'localizer',
    'partner',
    'chargeType',
    'expectedCost',
    'expectedStart',
    'expectedFinish',
  ],
};

const scheduled = {
  name: 'scheduled',
  color: 'warning',
  data: [
    'partner',
    'expectedStart',
    'expectedFinish',
  ],
};

const toApprove = {
  name: 'toApprove',
  color: 'warning',
};

const toVote = {
  name: 'toVote',
  color: 'warning',
};

const progressing = {
  name: 'progressing',
  color: 'info',
  data: ['expectedFinish'],
};

const suspended = {
  name: 'suspended',
  color: 'warning',
  data: [
    'waitingFor',
    'expectedContinue',
  ],
};

const finished = {
  name: 'finished',
  color: 'primary',
  data: [
    'txId',
    'actualCost',
    'actualStart',
    'actualFinish',
  ],
};

const closed = {
  name: 'closed',
  color: 'default',
};

const deleted = {
  name: 'deleted',
  color: 'danger',
};

Tickets.statuses = {
  reported, confirmed, scheduled, toApprove, toVote, progressing, suspended, finished, closed, deleted,
};
Tickets.statusValues = Object.keys(Tickets.statuses);

// == Ticket workfows:

Tickets.workflows = {
  issue: {
    start: [reported],
    reported: { obj: reported, next: [confirmed, deleted] },
    confirmed: { obj: confirmed, next: [progressing] },
    progressing: { obj: progressing, next: [finished, suspended] },
    suspended: { obj: suspended, next: [progressing] },
    finished: { obj: finished, next: [closed, progressing] },
    closed: { obj: closed, next: [] },
    deleted: { obj: deleted, next: [reported] },
  },
  upgrade: {
    start: [reported],
    reported: { obj: reported, next: [confirmed, deleted] },
    confirmed: { obj: confirmed, next: [progressing, toApprove, toVote] },
    toApprove: { obj: toApprove, next: [progressing, confirmed, closed] },
    toVote: { obj: toVote, next: [progressing, confirmed, closed] },
    progressing: { obj: progressing, next: [finished, suspended] },
    suspended: { obj: suspended, next: [progressing] },
    finished: { obj: finished, next: [closed, progressing] },
    closed: { obj: closed, next: [] },
    deleted: { obj: deleted, next: [reported] },
  },
  maintenance: {
    start: [scheduled],
    scheduled: { obj: scheduled, next: [progressing] },
    progressing: { obj: progressing, next: [finished] },
    finished: { obj: finished, next: [closed, progressing] },
    closed: { obj: closed, next: [] },
    deleted: { obj: deleted, next: [scheduled] },
  },
};

Topics.categoryHelpers('ticket', {
  workflow() {
    return Tickets.workflows[this.ticket.type];
  },
  modifiableFields() {
    return Tickets.modifiableFields;
  },
});

// ===================================================

Topics.categories.ticket = Tickets;

Factory.define('ticket', Topics, {
  category: 'ticket',
  title: () => 'New ticket on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'reported',
  ticket: {
    type: 'issue',
    category: 'building',
    urgency: 'normal',
  },
});
