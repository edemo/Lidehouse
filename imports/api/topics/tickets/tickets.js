import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { Topics } from '/imports/api/topics/topics.js';

export const Tickets = {};

Tickets.typeValues = ['issue', 'maintenance'];
Tickets.urgencyValues = ['high', 'normal', 'low'];
Tickets.urgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};
// Tickets.categoryValues = ['building', 'garden', 'service'];

Tickets.extensionRawSchema = {
  type: { type: String, allowedValues: Tickets.typeValues, autoform: autoformOptions(Tickets.typeValues, 'schemaTickets.ticket.type.') },
//  category: { type: String, allowedValues: Tickets.categoryValues, autoform: autoformOptions(Tickets.categoryValues, 'schemaTickets.ticket.category.'), optional: true },
  urgency: { type: String, allowedValues: Tickets.urgencyValues, autoform: autoformOptions(Tickets.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  localizer: { type: String, optional: true },

  expectedCost: { type: Number, decimal: true, optional: true },
  expectedStart: { type: Date, optional: true },
  expectedFinish: { type: Date, optional: true },
  expectedContinue: { type: Date, optional: true },
  waitingFor: { type: String, optional: true },
  actualCost: { type: Number, decimal: true, optional: true },
  actualStart: { type: Date, optional: true },
  actualFinish: { type: Date, optional: true },
  actualContinue: { type: Date, optional: true },
};

Tickets.extensionSchema = new SimpleSchema(Tickets.extensionRawSchema);

Tickets.schema = new SimpleSchema([
  Topics.schema,
  { ticket: { type: Tickets.extensionSchema, optional: true } },
]);

Tickets.helpers = {
};
Tickets.publicFields = { ticket: 1 };
Tickets.modifiableFields = ['ticket.category', 'ticket.urgency'];

Topics.attachSchema({
  ticket: { type: Tickets.extensionSchema, optional: true } });

_.extend(Topics.publicFields, Tickets.publicFields);

Meteor.startup(function attach() {
  Tickets.schema.i18n('schemaTickets');   // translation is different from schemaTopics
});

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
    'expectedCost',
    'expectedStart',
    'expectedFinish',
  ],
};

const scheduled = {
  name: 'scheduled',
  color: 'warning',
  data: [
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

Tickets.workflowOf = function workflowOf(ticket) {
  return Tickets.workflows[ticket.ticket.type];
};

// ===================================================

Topics.categorySpecs.ticket = Tickets;

Factory.define('ticket', Topics, {
  category: 'ticket',
  title: () => 'New ticket on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'reported',
  ticket: {
    type: 'reported',
    category: 'building',
    urgency: 'normal',
  },
});
