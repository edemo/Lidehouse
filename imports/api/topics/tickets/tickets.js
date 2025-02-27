import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Clock } from '/imports/utils/clock.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { Parcels, chooseLocalizer } from '../../parcels/parcels';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { choosePartner } from '/imports/api/partners/partners.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
// import { readableId } from '/imports/api/readable-id.js';

export const Tickets = {};

Tickets.typeValues = ['issue', 'upgrade', 'maintenance'];
Tickets.urgencyValues = ['high', 'normal', 'low'];
Tickets.urgencyColors = { high: 'danger', normal: 'warning', low: 'primary' };
Tickets.chargeTypeValues = ['oneoff', 'lumpsum', 'warranty', 'insurance'];

Tickets.extensionRawSchema = {
  type: { type: String, allowedValues: Tickets.typeValues, autoform: { type: 'hidden' } },
  urgency: { type: String, allowedValues: Tickets.urgencyValues, autoform: allowedOptions(), defaultValue: 'normal' },
  localizer: { type: String, optional: true, autoform: Parcels.choosePhysical },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...choosePartner } },
  contractId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseContract }, optional: true },
  chargeType: { type: String, allowedValues: Tickets.chargeTypeValues, autoform: allowedOptions(), optional: true },

  expectedCost: { type: Number, decimal: true, optional: true },
  expectedStart: { type: Date, optional: true, autoform: { defaultValue: () => ModalStack.getVar('expectedStart') } },
  expectedFinish: { type: Date, optional: true },
  expectedContinue: { type: Date, optional: true },
  waitingFor: { type: String, optional: true },
  actualCost: { type: Number, decimal: true, optional: true },
  txIdentifiers: { type: String, optional: true },
  actualStart: { type: Date, optional: true },
  actualFinish: { type: Date, optional: true },
  actualContinue: { type: Date, optional: true },

  // readableId: { type: readableId(Topics, 'T', 'ticket'), optional: true },
};

Tickets.extensionSchema = new SimpleSchema(Tickets.extensionRawSchema);
Topics.attachVariantSchema(
  new SimpleSchema({ ticket: { type: Tickets.extensionSchema } }),
  { selector: { category: 'ticket' } },
);

Topics.simpleSchema({ category: 'ticket' }).i18n('schemaTickets');   // translation is different from schemaTopics

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
    'partnerId',
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
    'localizer',
    'partnerId',
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
  data: [
    'actualStart',
    'expectedCost',
    'expectedFinish',
  ],
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
    'actualCost',
    'txIdentifiers',
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
    finish: [finished],
    reported: { obj: reported, next: [confirmed, finished, closed, deleted] },
    confirmed: { obj: confirmed, next: [progressing, suspended, finished, closed] },
    progressing: { obj: progressing, next: [suspended, finished, closed] },
    suspended: { obj: suspended, next: [progressing, finished, closed] },
    finished: { obj: finished, next: [closed, progressing] },
    closed: { obj: closed, next: [reported, confirmed, progressing, suspended, finished, deleted] },
    deleted: { obj: deleted, next: [reported] },
  },
  upgrade: {
    start: [reported],
    finish: [finished],
    reported: { obj: reported, next: [confirmed, finished, closed, deleted] },
    confirmed: { obj: confirmed, next: [progressing, suspended, toApprove, toVote, finished, closed] },
    toApprove: { obj: toApprove, next: [progressing, confirmed, finished, closed] },
    toVote: { obj: toVote, next: [progressing, confirmed, finished, closed] },
    progressing: { obj: progressing, next: [suspended, finished, closed] },
    suspended: { obj: suspended, next: [progressing, finished, closed] },
    finished: { obj: finished, next: [closed, progressing] },
    closed: { obj: closed, next: [reported, confirmed, toApprove, toVote, progressing, suspended, finished, deleted] },
    deleted: { obj: deleted, next: [reported] },
  },
  maintenance: {
    start: [scheduled],
    finish: [finished],
    scheduled: { obj: scheduled, next: [progressing, finished, closed] },
    progressing: { obj: progressing, next: [finished, closed] },
    finished: { obj: finished, next: [closed, progressing] },
    closed: { obj: closed, next: [scheduled, progressing, finished, deleted] },
    deleted: { obj: deleted, next: [scheduled] },
  },
};

Topics.categoryHelpers('ticket', {
  entityName() {
    return this.ticket.type;
  },
  contract() {
    return Contracts.findOne(this._id);
  },
  workflow() {
    return Tickets.workflows[this.ticket.type];
  },
  statusFields(statusObject = this.statusObject()) {
    return (statusObject.data || []).map(d => 'ticket.' + d);
  },
  modifiableFields() {
    let pastStatuses = [this.startStatus()];
    const statusChanges = Comments.find({ category: 'statusChange', topicId: this._id }).fetch();
    pastStatuses = pastStatuses.concat(_.pluck(statusChanges, 'status').map(s => this.statusObject(s)));
    let fields = Topics.modifiableFields;
    pastStatuses.forEach(status => {
      fields = fields.concat(this.statusFields(status));
    });
    return fields;
  },
  inputFields() {
    return Topics.modifiableFields.concat(this.statusFields(this.startStatus()));
  },
  displayStart() {
    return (this.ticket.actualStart || this.ticket.expectedStart);
  },
});

// ===================================================

Topics.categories.ticket = Tickets;

Factory.define('issue', Topics, {
  category: 'ticket',
  serial: 0,
  title: () => 'New issue on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'reported',
  ticket: {
    type: 'issue',
    urgency: 'normal',
  },
});

Factory.define('maintenance', Topics, {
  category: 'ticket',
  serial: 0,
  title: () => 'New maintenance on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'scheduled',
  ticket: {
    type: 'maintenance',
    urgency: 'normal',
  },
});

Factory.define('upgrade', Topics, {
  category: 'ticket',
  serial: 0,
  title: () => 'New upgrade on ' + faker.random.word(),
  text: () => faker.lorem.paragraph(),
  status: 'scheduled',
  ticket: {
    type: 'upgrade',
    urgency: 'low',
  },
});

Factory.define('ticketStatusChange', Comments, {
  text: () => faker.lorem.paragraph(),
  status: 'scheduled',
  data: {
    localizer: 'At the basement',
    expectedCost: 5000,
    expectedStart: () => Clock.currentDate(),
    expectedFinish: () => Clock.date(1, 'week', 'ahead'),
  },
});
