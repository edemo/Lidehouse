import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions } from '/imports/api/method-checks.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { TicketStatusChangeSchema } from './tickets.js';

export const ticketStatusChange = new ValidatedMethod({
  name: 'ticket.statusChange',
  validate: TicketStatusChangeSchema.validator({ clean: true }),

  run({ topicId, status, text }) {
    const topic = checkExists(Topics, topicId);
    checkTopicPermissions(this.userId, 'statusChange', topic);
    const result = Topics.update(topicId, { $set: { 'ticket.status': status } });

    if (!text) return result; // Or maybe set a text: `Status changed to ${status}` ?
    Comments.methods.insert._execute({ userId: this.userId },
      { topicId, userId: this.userId, text }
    );
    return result;
  },
});
