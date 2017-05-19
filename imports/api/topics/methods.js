import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';

import { Topics } from './topics.js';

const TOPIC_ID_ONLY = new SimpleSchema({
  topicId: Topics.simpleSchema().schema('_id'),
}).validator({ clean: true, filter: false });

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: new SimpleSchema({
    communityId: { type: String },
    language: { type: String },
  }).validator(),

  run({ communityId, language }) {
    return Topics.insert({ communityId }, null, language);
  },
});

export const makePrivate = new ValidatedMethod({
  name: 'topics.makePrivate',
  validate: TOPIC_ID_ONLY,

  run({ topicId }) {
    if (!this.userId) {
      throw new Meteor.Error('topics.makePrivate.notLoggedIn',
        'Must be logged in to make private topics.');
    }

    const topic = Topics.findOne(topicId);

    if (topic.isLastPublicTopic()) {
      throw new Meteor.Error('topics.makePrivate.lastPublicTopic',
        'Cannot make the last public topic private.');
    }

    Topics.update(topicId, {
      $set: { userId: this.userId },
    });
  },
});

export const makePublic = new ValidatedMethod({
  name: 'topics.makePublic',
  validate: TOPIC_ID_ONLY,

  run({ topicId }) {
    if (!this.userId) {
      throw new Meteor.Error('topics.makePublic.notLoggedIn',
        'Must be logged in.');
    }

    const topic = Topics.findOne(topicId);

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('topics.makePublic.accessDenied',
        'You don\'t have permission to edit this topic.');
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data
    Topics.update(topicId, {
      $unset: { userId: true },
    });
  },
});

export const updateName = new ValidatedMethod({
  name: 'topics.updateName',
  validate: new SimpleSchema({
    topicId: Topics.simpleSchema().schema('_id'),
    newName: Topics.simpleSchema().schema('name'),
  }).validator({ clean: true, filter: false }),

  run({ topicId, newName }) {
    const topic = Topics.findOne(topicId);

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('topics.updateName.accessDenied',
        'You don\'t have permission to edit this topic.');
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data

    Topics.update(topicId, {
      $set: { name: newName },
    });
  },
});

export const remove = new ValidatedMethod({
  name: 'topics.remove',
  validate: TOPIC_ID_ONLY,

  run({ topicId }) {
    const topic = Topics.findOne(topicId);

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('topics.remove.accessDenied',
        'You don\'t have permission to remove this topic.');
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data

    if (topic.isLastPublicTopic()) {
      throw new Meteor.Error('topics.remove.lastPublicTopic',
        'Cannot delete the last public topic.');
    }

    Topics.remove(topicId);
  },
});

// Get list of all method names on Topics
const TOPICS_METHOD_NAMES = _.pluck([
  insert,
  makePublic,
  makePrivate,
  updateName,
  remove,
], 'name');

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
