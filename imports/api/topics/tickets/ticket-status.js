import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
//import { autoformOptions } from '/imports/utils/autoform.js';
import { Events } from '/imports/api/events/events.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { Topics } from '/imports/api/topics/topics.js';

// === Ticket statuses

const reported = {
  name: 'reported',
  color: 'warning',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'reported' },
  }),
};

const confirmed = {
  name: 'confirmed',
  color: 'info',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'confirmed' },
//    category: { type: String, allowedValues: Topics.ticketCategoryValues, autoform: autoformOptions(Topics.ticketCategoryValues, 'schemaTickets.ticket.category.'), optional: true },
//    urgency: { type: String, allowedValues: Topics.urgencyValues, autoform: autoformOptions(Topics.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
    localizer: { type: String, optional: true },
    expectedCost: { type: Number, decimal: true, optional: true },
    expectedStart: { type: Date, optional: true },
    expectedFinish: { type: Date, optional: true },
  }),
};

const scheduled = {
  name: 'scheduled',
  color: 'warning',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'scheduled' },
    expectedStart: { type: Date, optional: true },
    expectedFinish: { type: Date, optional: true },
  }),
};

const progressing = {
  name: 'progressing',
  color: 'info',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'progressing' },
    expectedFinish: { type: Date, optional: true },
  }),
};

const suspended = {
  name: 'suspended',
  color: 'warning',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'suspended' },
    expectedContinue: { type: Date, optional: true },
  }),
};

const finished = {
  name: 'finished',
  color: 'primary',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'finished' },
    actualCost: { type: Number, decimal: true, optional: true },
    actualStart: { type: Date, optional: true },
    actualFinish: { type: Date, optional: true },
  }),
};

const closed = {
  name: 'closed',
  color: 'default',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'closed' },
  }),
};

const deleted = {
  name: 'deleted',
  color: 'danger',
  schema: new SimpleSchema({
    status: { type: String, autoform: { omit: true }, defaultValue: 'deleted' },
  }),
};

export const TicketStatuses = {
  reported, confirmed, scheduled, progressing, suspended, finished, closed, deleted,
};
export const TicketStatusNames = Object.keys(TicketStatuses);
TicketStatusNames.forEach(statusName => Events.typeValues.push(`statusChangeTo.${statusName}`));

// == Ticket types:

export const TicketTypes = {
  reported: {
    start: 'reported',
    reported: {
      next: ['confirmed'],
    },
    confirmed: {
      next: ['progressing'],
    },
    progressing: {
      next: ['finished', 'suspended'],
    },
    suspended: {
      next: ['progressing'],
    },
    finished: {
      next: ['closed', 'progressing'],
    },
    closed: {
      next: [],
    },
    deleted: {
      next: ['reported'],
    },
  },
  scheduled: {
    start: 'scheduled',
    scheduled: {
      next: ['progressing'],
    },
    progressing: {
      next: ['finished'],
    },
    finished: {
      next: ['closed', 'progressing'],
    },
    closed: {
      next: [],
    },
    deleted: {
      next: ['scheduled'],
    },
  },
};
export const TicketTypeNames = Object.keys(TicketTypes);

export function possibleNextStatuses(topic) {
  return TicketTypes[topic.ticket.type][topic.ticket.status].next.concat('deleted');
}

export function statusChangeEventSchema(statusName) {
  const statusObject = TicketStatuses[statusName];
  const schema = statusName ?
    new SimpleSchema([Events.baseSchema, {
      ticket: { type: statusObject.schema, optional: true },
    }]) :
    new SimpleSchema([Events.baseSchema, {
      ticket: { type: Object, blackbox: true },
    }]);
  schema.i18n('schemaTickets');
  return schema;
}

/*
export let possibleNextStatusesOnUI = () => {};
if (Meteor.isClient) {
  import { Session } from 'meteor/session';
  import { Topics } from '/imports/api/topics/topics.js';

  possibleNextStatusesOnUI = function () {
    const topicId = Session.get('activeTopicId');
    const topic = Topics.findOne(topicId);
    return possibleNextStatuses(topic);
  };
}
*/
