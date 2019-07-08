/* eslint-disable dot-notation */

import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';
// import { readableId } from '/imports/api/readable-id.js';

import { checkExists, checkNotExists, checkPermissions, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import '/imports/api/users/users.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from './topics.js';
// In order for Topics.simpleSchema to be the full schema to validate against, we need all subtype schema
import './votings/votings.js';
import { Tickets } from './tickets/tickets.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';
import './rooms/rooms.js';
import './feedbacks/feedbacks.js';

function checkStatusStartAllowed(topic, status) {
  if (!_.contains(topic.possibleStartStatuses(), status)) {
    throw new Meteor.Error('err_permissionDenied', `Topic ${topic._id} cannot start in ${status}`, topic.toString());
  }
}

function checkStatusChangeAllowed(topic, statusTo) {
  if (!_.contains(topic.possibleNextStatuses(), statusTo)) {
    throw new Meteor.Error('err_permissionDenied', `Topic ${topic._id} cannot move from ${topic.status} into status ${statusTo}`, topic.toString());
  }
}

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.simpleSchema().validator({ clean: true }),
  run(doc) {
    if (doc._id) checkNotExists(Topics, doc._id);
    doc = Topics._transform(doc);
    // readableId(Topics, doc);
    checkTopicPermissions(this.userId, 'insert', doc);
    checkStatusStartAllowed(doc, doc.status);
    doc.userId = this.userId;   // One can only post in her own name
    const topicId = Topics.insert(doc);
    const newTopic = Topics.findOne(topicId); // we need the createdAt timestamp from the server
    updateMyLastSeen._execute({ userId: this.userId },
      { topicId, lastSeenInfo: { timestamp: newTopic.createdAt } });
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
    const topic = checkExists(Topics, _id);
    checkTopicPermissions(this.userId, 'update', topic);
    checkModifier(topic, modifier, topic.modifiableFields());
    Topics.update(_id, modifier);
  },
});

export const statusChange = new ValidatedMethod({
  name: 'topics.statusChange',
  validate: Comments.simpleSchema().validator({ clean: true }),
  run(event) {
    const topic = checkExists(Topics, event.topicId);
    const category = topic.category;
    const workflow = topic.workflow();
    // checkPermissions(this.userId, `${category}.${event.type}.${topic.status}.leave`, topic.communityId);
    checkPermissions(this.userId, `${category}.statusChangeTo.${event.status}.enter`, topic.communityId);
    checkStatusChangeAllowed(topic, event.status);
    event.userId = this.userId;   // One can only post in her own name

    const onLeave = workflow[topic.status].obj.onLeave;
    if (onLeave) onLeave(event, topic);

    const topicModifier = {};
    topicModifier.status = event.status;
    const statusObject = Topics.categories[category].statuses[event.status];
    if (statusObject.data) {
      statusObject.data.forEach(key => topicModifier[`${category}.${key}`] = event.data[key]);
    }
    const updateResult = Topics.update(event.topicId, { $set: topicModifier });

    const insertResult = Comments.insert(event);

    const newTopic = Topics.findOne(event.topicId);
    const onEnter = workflow[event.status].obj.onEnter;
    if (onEnter) onEnter(event, newTopic);

    updateMyLastSeen._execute({ userId: this.userId },
      { topicId: topic._id, lastSeenInfo: { timestamp: newTopic.createdAt } },
    );

    return insertResult;
  },
});

export const remove = new ValidatedMethod({
  name: 'topics.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const topic = checkExists(Topics, _id);
    checkTopicPermissions(this.userId, 'remove', topic);

    Topics.remove(_id);
    Comments.remove({ topicId: _id });
  },
});


Topics.methods = {
  insert, update, statusChange, remove,
};

// ----- RATE LIMITING --------

// Get list of all method names on Topics
const TOPICS_METHOD_NAMES = _.pluck([insert, update, remove], 'name');
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
