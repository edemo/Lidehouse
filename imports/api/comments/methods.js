import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';

import { Comments } from './comments.js';
import { Topics } from '../topics/topics.js';
import { checkExists, checkPermissions, checkModifier } from '../method-checks';
import { updateMyLastSeen } from '/imports/api/users/methods.js';

export const insert = new ValidatedMethod({
  name: 'comments.insert',
  validate: Comments.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Comments._transform(doc);
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.getType()}.insert`, topic.communityId);
    doc.userId = this.userId;   // One can only post in her own name
    const docId = Comments.insert(doc);
    const newDoc = Comments.findOne(docId); // we need the createdAt timestamp from the server
    updateMyLastSeen._execute({ userId: this.userId },
      { topicId: topic._id, lastSeenInfo: { timestamp: newDoc.createdAt } },
    );
    return docId;
  },
});

export const update = new ValidatedMethod({
  name: 'comments.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Comments, _id);
    const topic = checkExists(Topics, doc.topicId);
    checkModifier(doc, modifier, ['text']);     // only the text can be modified
    checkPermissions(this.userId, `${doc.getType()}.update`, topic.communityId, doc);

    Comments.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'comments.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Comments, _id);
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.getType()}.remove`, topic.communityId, doc);

    Comments.remove(_id);
  },
});

Comments.methods = Comments.methods || {};
_.extend(Comments.methods, { insert, update, remove });

//--------------------------------------------------------

const COMMENTS_METHOD_NAMES = _.pluck([
  insert,
  update,
  remove,
], 'name');

if (Meteor.isServer) {
  // Only allow 5 comments operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(COMMENTS_METHOD_NAMES, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
