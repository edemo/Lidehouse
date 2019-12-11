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
  validate: doc => Comments.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    doc = Comments._transform(doc);
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, `${doc.entityName()}.insert`, topic.communityId);
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
    checkPermissions(this.userId, `${doc.entityName()}.update`, topic.communityId, doc);

    Comments.update(_id, modifier, { selector: { category: doc.category } });
  },
});

export const move = new ValidatedMethod({
  name: 'comments.move',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    destinationId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id, destinationId }) {
    const doc = checkExists(Comments, _id);
    checkPermissions(this.userId, 'comment.move', doc.communityId, doc);

    Comments.update(_id, { $set: { topicId: destinationId } });
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
    checkPermissions(this.userId, `${doc.entityName()}.remove`, topic.communityId, doc);

    Comments.remove(_id);
  },
});

Comments.methods = Comments.methods || {};
_.extend(Comments.methods, { insert, update, move, remove });

//--------------------------------------------------------

const COMMENTS_METHOD_NAMES = _.pluck([insert, update, move, remove], 'name');

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
