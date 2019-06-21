import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Comments } from '/imports/api/comments/comments.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { VoteStatuses, VoteTypes } from '/imports/api/topics/votings/voting-status.js';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Topics } from '../topics';

// === Ticket statuses

// Tickets.categoryValues = ['building', 'garden', 'service'];
export const TicketUrgencyValues = ['high', 'normal', 'low'];
export const TicketUrgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};

/*function fixedStatusValue(value) {
  return {
    options() { return [{ label: __('schemaTickets.ticket.status.' + value), value }]; },
    firstOption: false,
    disabled: true,
  };
}*/

const reported = {
  name: 'reported',
  color: 'warning',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
    urgency: { type: String, allowedValues: TicketUrgencyValues, autoform: autoformOptions(TicketUrgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  }),
};

const confirmed = {
  name: 'confirmed',
  color: 'info',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
//    category: { type: String, allowedValues: Topics.ticketCategoryValues, autoform: autoformOptions(Topics.ticketCategoryValues, 'schemaTickets.ticket.category.'), optional: true },
    localizer: { type: String, optional: true },
    expectedCost: { type: Number, decimal: true, optional: true },
    expectedStart: { type: Date, optional: true },
    expectedFinish: { type: Date, optional: true },
  }),
};

const scheduled = {
  name: 'scheduled',
  color: 'warning',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
    expectedStart: { type: Date, optional: true },
    expectedFinish: { type: Date, optional: true },
  }),
};

const toApprove = {
  name: 'toApprove',
  color: 'warning',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
  }),
};

const toVote = {
  name: 'toVote',
  color: 'warning',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
  }),
};

const progressing = {
  name: 'progressing',
  color: 'info',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
    expectedFinish: { type: Date, optional: true },
  }),
};

const suspended = {
  name: 'suspended',
  color: 'warning',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
    waitingFor: { type: String, optional: true },
    expectedContinue: { type: Date, optional: true },
  }),
};

const finished = {
  name: 'finished',
  color: 'primary',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
    actualCost: { type: Number, decimal: true, optional: true },
    actualStart: { type: Date, optional: true },
    actualFinish: { type: Date, optional: true },
  }),
};

const closed = {
  name: 'closed',
  color: 'default',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
  }),
};

const deleted = {
  name: 'deleted',
  color: 'danger',
  preProcess() {
    console.log('pre');
  },
  postProcess() {
    console.log('post');
  },
  ticketSchema: new SimpleSchema({
  }),
};

export const TicketStatuses = {
  reported, confirmed, scheduled, toApprove, toVote, progressing, suspended, finished, closed, deleted,
};

//Object.keys(TicketStatuses).forEach(statusName => Comments.typeValues.push(`statusChangeTo.${statusName}`));
Object.keys(TicketStatuses).forEach(statusName => Topics.allowedValues.push(statusName));
Object.keys(TicketStatuses).forEach(statusName => Comments.subjectValues.push(statusName));

// == Ticket types:

export const TicketTypes = {
  issue: {
    start: 'reported',
    reported: { next: ['confirmed', 'deleted'] },
    confirmed: { next: ['progressing', 'toApprove', 'toVote'] },
    toApprove: { next: ['progressing', 'confirmed', 'closed'] },
    toVote: { next: ['progressing', 'confirmed', 'closed'] },
    progressing: { next: ['finished', 'suspended'] },
    suspended: { next: ['progressing'] },
    finished: { next: ['closed', 'progressing'] },
    closed: { next: [] },
    deleted: { next: ['reported'] },
  },
  maintenance: {
    start: 'scheduled',
    scheduled: { next: ['progressing'] },
    progressing: { next: ['finished'] },
    finished: { next: ['closed', 'progressing'] },
    closed: { next: [] },
    deleted: { next: ['scheduled'] },
  },
};

export function possibleNextStatuses(topic) {
  return TicketTypes[topic.ticket.type][topic.status].next;
}

/*export function statusChangeEventSchema(statusName, topicId) {
  const topic = Topics.findOne(topicId);
  let schema =
  new SimpleSchema([Comments.schema, {
    status: { type: String, autoform: fixedStatusValue(statusName), autoValue() { return statusName; } },
  }]);
  if (topic && topic.category === 'vote') {
    const voteStatusObject = VoteStatuses[statusName];
    schema = new SimpleSchema([Comments.schema, {
      status: { type: String, allowedValues: possibleNextStatuses(topic), autoform: fixedStatusValue(statusName), autoValue() { return statusName; } },
      vote: { type: voteStatusObject.voteSchema, optional: true },
    }]);
  }
  if (topic && topic.category === 'ticket') {
    const ticketStatusObject = TicketStatuses[statusName];
    schema = new SimpleSchema([Comments.schema, {
      status: { type: String, allowedValues: possibleNextStatuses(topic), autoform: fixedStatusValue(statusName), autoValue() { return statusName; } },
      ticket: { type: ticketStatusObject.ticketSchema, optional: true },
    }]);
  }
  schema.i18n('schemaTickets');
  return schema;
}


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
