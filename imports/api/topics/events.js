import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Comments } from '/imports/api/comments/comments.js';
import { TicketStatuses, TicketTypes } from '/imports/api/topics/tickets/ticket-status.js';
import { VoteStatuses, VoteTypes } from '/imports/api/topics/votings/voting-status.js';

export function triggerFunctionsByTopicCategory(topic, functionCollection, functionNameArray, param1, param2) {
  functionNameArray.forEach(functionName => functionCollection[topic.category][functionName](param1, param2));
}

export function fixedStatusValue(value) {
  return {
    options() { return [{ label: __('schemaTickets.ticket.status.' + value), value }]; },
    firstOption: false,
    disabled: true,
  };
}

export const functionCollectionByTopicCategory = {
  ticket: {
    returnSchemaByStatus(status, topic) {
      const ticketStatusObject = TicketStatuses[status];
      const schema = new SimpleSchema([Comments.schema, {
        status: { type: String, allowedValues: TicketTypes[topic.ticket.type][topic.status].next, autoform: fixedStatusValue(status), autoValue() { return status; } },
        ticket: { type: ticketStatusObject.ticketSchema, optional: true },
      }]);
      schema.i18n('schemaTickets');
      return schema;
    },
    triggerPreAndPostProcesses(doc) {
      TicketStatuses[doc.subject].preProcess(doc.topicId);
      TicketStatuses[doc.subject].postProcess(doc.topicId);
    },
    modifyingTopic(doc) {
      const topicModifier = {};
      Object.keys(doc.ticket).forEach(key => topicModifier[`ticket.${key}`] = doc.ticket[key]);
      topicModifier.status = doc.status;
      const result = Topics.update(doc.topicId, { $set: topicModifier });
      return result;
    },
    insertEvent(doc) {
      doc.data = doc.ticket; delete doc.ticket;
      doc.type = doc.type;
      doc.subject = doc.status;
      Comments.insert(doc);
    },
  },
  vote: {
    returnSchemaByStatus(status, topic) {
      const voteStatusObject = VoteStatuses[status];
      const schema = new SimpleSchema([Comments.schema, {
        status: { type: String, allowedValues: VoteTypes[topic.vote.type][topic.status].next, autoValue() { return status; } },
        vote: { type: voteStatusObject.voteSchema, optional: true },
      }]);
      schema.i18n('schemaTickets');
      return schema;
    },
    triggerPreAndPostProcesses(doc) {
      VoteStatuses[doc.subject].preProcess(doc.topicId);
      VoteStatuses[doc.subject].postProcess(doc.topicId);
    },
    modifyingTopic(doc) {
      const topicModifier = {};
      topicModifier.status = doc.status;
      const result = Topics.update(doc.topicId, { $set: topicModifier });
      return result;
    },
    insertEvent(doc) {
      doc.data = doc.ticket; delete doc.ticket;
      doc.type = doc.type;
      doc.subject = doc.status;
      Comments.insert(doc);
    },
  },
};

export function statusChangeEventSchema(status, topicId) {
  const topic = Topics.findOne(topicId);
  //triggerFunctionsByTopicCategory(topic, functionCollectionByTopicCategory, ['returnSchemaByStatus'], status, topic);
  let schema = {};
  if (topic.category === 'ticket') {
    const ticketStatusObject = TicketStatuses[status];
    schema = new SimpleSchema([Comments.schema, {
      status: { type: String, allowedValues: TicketTypes[topic.ticket.type][topic.status].next, autoform: fixedStatusValue(status), autoValue() { return status; } },
      ticket: { type: ticketStatusObject.ticketSchema, optional: true },
    }]);
    schema.i18n('schemaTickets');
  }
  if (topic.category === 'vote') {
    const voteStatusObject = VoteStatuses[status];
    schema = new SimpleSchema([Comments.schema, {
      status: { type: String, allowedValues: VoteTypes[topic.vote.type][topic.status].next, autoValue() { return status; } },
      vote: { type: voteStatusObject.voteSchema, optional: true },
    }]);
    schema.i18n('schemaTickets');
  }
  return schema;
}

export const statusChange = new ValidatedMethod({
  name: 'statusChange',
  validate(doc) { statusChangeEventSchema(doc.status, doc.topicId); },
  run(event) {
    const topic = checkExists(Topics, event.topicId);
    checkPermissions(this.userId, `${topic.category}.${event.type}.${event.status}.insert`, topic.communityId);
    triggerFunctionsByTopicCategory(topic, functionCollectionByTopicCategory, ['modifyingTopic', 'insertEvent', 'triggerPreAndPostProcesses'], event);
  },
});

