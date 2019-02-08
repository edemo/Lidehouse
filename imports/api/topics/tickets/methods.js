import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions } from '/imports/api/method-checks.js';
import { debugAssert } from '/imports/utils/assert.js';

import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { TicketStatusChangeSchema } from './tickets.js';

export const ticketStatusChange = new ValidatedMethod({
  name: 'ticket.statusChange',
  validate: TicketStatusChangeSchema.validator({ clean: true }),

  run({ topicId, status, text }) {
    const result = Topics.methods.update._execute({ userId: this.userId },
      { _id: topicId, modifier: { $set: { 'ticket.status': status } } }
    );
    if (!text) return result; // Or maybe set a text: `Status changed to ${status}` ?
    Comments.methods.insert._execute({ userId: this.userId },
      { topicId, userId: this.userId, text }
    );
    return result;
  },
});
