/* eslint-disable dot-notation */

import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkTopicPermissions, checkModifier } from '/imports/api/method-checks.js';
import '/imports/api/users/users.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from './topics.js';
// In order for Topics.simpleSchema to be the full schema to validate against, we need all subtype schema
import './votings/votings.js';
import './tickets/tickets.js';
import './rooms/rooms.js';
import './feedbacks/feedbacks.js';

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.simpleSchema().validator({ clean: true }),
  run(doc) {
    if (doc._id) checkNotExists(Topics, doc._id);
    checkTopicPermissions(this.userId, 'insert', doc);
    const topicId = Topics.insert(doc);
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
    checkModifier(topic, modifier, ['title', 'text', 'sticky', 'agendaId']);
    Topics.update({ _id }, modifier);
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
