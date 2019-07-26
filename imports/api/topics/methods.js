/* eslint-disable dot-notation */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { CollectionHooks } from 'meteor/matb33:collection-hooks';
import { _ } from 'meteor/underscore';

import { crudBatchOps } from '/imports/api/batch-method.js';
import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import '/imports/api/users/users.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from './topics.js';
// In order for Topics.simpleSchema to be the full schema to validate against, we need all subtype schema
import './votings/votings.js';
import './tickets/tickets.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import './rooms/rooms.js';
import './feedbacks/feedbacks.js';

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.simpleSchema().validator({ clean: true }),
  run(doc) {
    CollectionHooks.defaultUserId = this.userId;
    if (doc._id) checkNotExists(Topics, doc._id);
    doc = Topics._transform(doc);
    // readableId(Topics, doc);
    checkTopicPermissions(this.userId, 'insert', doc);
    const topicId = Topics.insert(doc);
    const newTopic = Topics.findOne(topicId); // we need the createdAt timestamp from the server
    updateMyLastSeen._execute({ userId: this.userId },
      { topicId, lastSeenInfo: { timestamp: newTopic.createdAt } });
    CollectionHooks.defaultUserId = undefined;
    return topicId;
  },
});

export const update = new ValidatedMethod({
  name: 'topics.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),
  run({ _id, modifier }) {
    CollectionHooks.defaultUserId = this.userId;
    const topic = checkExists(Topics, _id);
    checkTopicPermissions(this.userId, 'update', topic);
    checkModifier(topic, modifier, topic.modifiableFields());
    Topics.update(_id, modifier);
    CollectionHooks.defaultUserId = undefined;
  },
});

export const move = new ValidatedMethod({
  name: 'topics.move',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    destinationId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id, destinationId }) {
    const doc = checkExists(Topics, _id);
    checkPermissions(this.userId, 'comments.move', doc.communityId, doc);
    Comments.insert({
      _id,
      topicId: destinationId,
      text: doc.text,
    });
    doc.comments().forEach((comment) => {
      Comments.update(comment._id, { $set: { topicId: destinationId } });
    });
    Topics.remove(_id);
  },
});

export const remove = new ValidatedMethod({
  name: 'topics.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    CollectionHooks.defaultUserId = this.userId;
    const topic = checkExists(Topics, _id);
    checkTopicPermissions(this.userId, 'remove', topic);

    Topics.remove(_id);
    Comments.remove({ topicId: _id });
    CollectionHooks.defaultUserId = undefined;
  },
});

Topics.methods = Topics.methods || {};
_.extend(Topics.methods, { insert, update, move, remove });
_.extend(Topics.methods, crudBatchOps(Topics));

// ----- RATE LIMITING --------

// Get list of all method names on Topics
const TOPICS_METHOD_NAMES = _.pluck([insert, update, move, remove], 'name');
// TODO: don't differentiate, overall rate limit needed

if (Meteor.isServer) {
  // Only allow 5 topic operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(TOPICS_METHOD_NAMES, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
