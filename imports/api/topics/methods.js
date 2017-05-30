import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';

import { Topics } from './topics.js';

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.simpleSchema().validator(),

  run({ doc }) {
    return Topics.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'topics.update',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    newTitle: Topics.simpleSchema().schema('title'),
    newText: Topics.simpleSchema().schema('text'),
  }).validator({ clean: true, filter: false }),

  run({ topicId, newTitle, newText }) {
    const topic = Topics.findOne(topicId);

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('topics.updateName.accessDenied',
        'You don\'t have permission to edit this topic.');
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data

    Topics.update(topicId, {
      $set: { title: newTitle, text: newText },
    });
  },
});

const TOPIC_ID_ONLY = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
}).validator({ clean: true, filter: false });

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
  update,
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
