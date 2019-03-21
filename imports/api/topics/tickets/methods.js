import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions } from '/imports/api/method-checks.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Events } from '../../events/events';

export const ticketStatusChange = new ValidatedMethod({
  name: 'ticket.statusChange',
  validate: Events.simpleSchema().validator({ clean: true }),

  run(doc) {
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.category}.insert`, topic.communityId);
    const newStatusName = doc.category.split('.')[1];
    const result = Topics.update(doc.topicId, { $set: { 'ticket.status': newStatusName } });

    Events.methods.insert._execute({ userId: this.userId }, doc);
    return result;
  },
});
