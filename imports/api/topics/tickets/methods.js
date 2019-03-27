import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Comments } from '/imports/api/comments/comments.js';
import { statusChangeEventSchema } from '/imports/api/topics/tickets/ticket-status.js';

export const ticketStatusChange = new ValidatedMethod({
  name: 'ticket.statusChange',
  validate: statusChangeEventSchema().validator({ clean: true }),

  run(comment) {
    const topic = checkExists(Topics, comment.topicId);
    checkPermissions(this.userId, `${comment.type}.insert`, topic.communityId);
    const topicModifier = {};
    Object.keys(comment.ticket).forEach(key => topicModifier[`ticket.${key}`] = comment.ticket[key]);
    const result = Topics.update(comment.topicId, { $set: topicModifier });

    comment.data = comment.ticket; delete comment.ticket;
    Comments.methods.insert._execute({ userId: this.userId }, comment);
    return result;
  },
});
