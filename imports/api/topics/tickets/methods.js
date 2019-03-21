import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Events } from '/imports/api/events/events';
import { statusChangeEventSchema } from '/imports/api/topics/tickets/ticket-status.js';

export const ticketStatusChange = new ValidatedMethod({
  name: 'ticket.statusChange',
  validate: statusChangeEventSchema().validator({ clean: true }),

  run(event) {
    const topic = checkExists(Topics, event.topicId);
    checkPermissions(this.userId, `${event.type}.insert`, topic.communityId);
    const topicModifier = {};
    Object.keys(event.ticket).forEach(key => topicModifier[`ticket.${key}`] = event.ticket[key]);
    const result = Topics.update(event.topicId, { $set: topicModifier });

    event.data = event.ticket; delete event.ticket;
    Events.methods.insert._execute({ userId: this.userId }, event);
    return result;
  },
});
