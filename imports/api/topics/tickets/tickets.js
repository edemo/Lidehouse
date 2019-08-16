import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { Clock } from '/imports/utils/clock.js';
import { __ } from '/imports/localization/i18n.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { chooseLocalizerNode } from '/imports/api/transactions/breakdowns/localizer.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
// import { readableId } from '/imports/api/readable-id.js';

export const Tickets = {};

Tickets.typeValues = ['issue', 'upgrade', 'maintenance'];
Tickets.urgencyValues = ['high', 'normal', 'low'];
Tickets.urgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};
Tickets.chargeTypeValues = ['oneoff', 'lumpsum', 'warranty', 'insurance'];

let chooseContract = {};
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  chooseContract = {
    options() {
      const communityId = Session.get('activeCommunityId');
      const contracts = Contracts.find({ communityId });
      const options = contracts.map(function option(c) {
        return { label: c.title, value: c._id };
      });
      return options;
    },
    firstOption: () => __('(Select one)'),
  };
}

Tickets.extensionRawSchema = {
  type: { type: String, allowedValues: Tickets.typeValues, autoform: autoformOptions(Tickets.typeValues, 'schemaTickets.ticket.type.') },
  urgency: { type: String, allowedValues: Tickets.urgencyValues, autoform: autoformOptions(Tickets.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  localizer: { type: String, optional: true, autoform: chooseLocalizerNode },
  partner: { type: String, optional: true },
  chargeType: { type: String, allowedValues: Tickets.chargeTypeValues, autoform: autoformOptions(Tickets.chargeTypeValues, 'schemaTickets.ticket.chargeType.'), optional: true },
  contractId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseContract, optional: true },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true /* TODO: Select from tx list */ },

  expectedCost: { type: Number, decimal: true, optional: true },
  expectedStart: { type: Date, optional: true, autoform: { defaultValue() {
    if (Meteor.isClient) {
      import { Session } from 'meteor/session';

      return Session.get('expectedStart');
    }
    return undefined;
  } } },
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

Tickets.publicExtensionFields = { ticket: 1 };
_.extend(Topics.publicFields, Tickets.publicExtensionFields);

// === Ticket statuses

const reported = {
  name: 'reported',
  color: 'warning',
  colorCode: '#F7A54B',
  data: ['urgency'],
};

const confirmed = {
  name: 'confirmed',
  color: 'info',
  data: [
    'localizer',
    'partner',
    'chargeType',
    'contractId',
    'expectedCost',
    'expectedStart',
    'expectedFinish',
  ],
};

const scheduled = {
  name: 'scheduled',
  color: 'info',
  colorCode: '#1FAEB0',
  data: [
    'partner',
    'chargeType',
    'contractId',
    'expectedStart',
    'expectedFinish',
  ],
};

const toApprove = {
  name: 'toApprove',
  color: 'warning',
  colorCode: '#F1A148',
};

const toVote = {
  name: 'toVote',
  color: 'warning',
  colorCode: '#F1A148',
};

const progressing = {
  name: 'progressing',
  color: 'info',
  colorCode: '#1FAEB0',
  data: ['expectedFinish'],
};

const suspended = {
  name: 'suspended',
  color: 'warning',
  colorCode: '#F1A148',
  data: [
    'waitingFor',
    'expectedContinue',
  ],
};

const finished = {
  name: 'finished',
  color: 'primary',
  colorCode: '#18A689',
  data: [
    'txId',
    'actualCost',
    'actualStart',
    'actualFinish',
  ],
};

const closed = {
  name: 'closed',
  colorCode: '#D1DADE',
  color: 'default',
};

const deleted = {
  name: 'deleted',
  color: 'danger',
  colorCode: '#EC4758',
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
  contract() {
    return Contracts.findOne(this._id);
  },
  workflow() {
    return Tickets.workflows[this.ticket.type];
  },
  statusFields(statusObject = this.statusObject()) {
    return (statusObject.data || []).map(d => 'ticket.' + d);
  },
  startFields() {
    return this.statusFields(this.startStatus());
  },
  modifiableFields() {
    return ['title', 'text', 'photo'].concat(this.startFields());
  },
});

// ===================================================

Topics.categories.ticket = Tickets;

Factory.define('ticket', Topics, {
  category: 'ticket',
  serial: 0,
  title: () => 'New ticket on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'reported',
  ticket: {
    type: 'issue',
    urgency: 'normal',
  },
});

Factory.define('ticketStatusChange', Comments, {
  text: () => faker.lorem.paragraph(),
  data: {
    localizer: 'At the basement',
    expectedCost: 5000,
    expectedStart: () => Clock.currentDate(),
    expectedFinish: () => Clock.date(1, 'week', 'ahead'),
  },
});
