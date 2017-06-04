/* eslint-disable dot-notation */

import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

import { Topics } from './topics.js';
import { Memberships } from '../memberships/memberships.js';

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.schema.validator({ clean: true }),

  run({ doc }) {
    const topic = Topics.findOne(doc._id);
    if (topic) {
      throw new Meteor.Error('err_duplicateId', 'This id is already used',
        `Method: topics.insert, Collection: topics, id: ${doc._id}`
      );
    }

    return Topics.insert(doc, function handle(err, res) {
      if (err) {
        throw new Meteor.Error('err_databaseWriteFailed', 'Database write failed',
        `Method: topics.insert, userId: ${this.userId}, topicId: ${doc._id}`);
      }
      debugAssert(res === 1);
    });
  },
});

export const update = new ValidatedMethod({
  name: 'topics.update',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    newTitle: Topics.simpleSchema().schema('title'),
    newText: Topics.simpleSchema().schema('text'),
  }).validator(),

  run({ topicId, newTitle, newText }) {
    const topic = Topics.findOne(topicId);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.update, Collection: topics, id: ${topicId}`
      );
    }

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.update, userId: ${this.userId}, topicId: ${topicId}`);
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data

    const topicModifier = {
      $set: { title: newTitle, text: newText },
    };

    Topics.update(topicId, topicModifier, function handle(err, res) {
      if (err) {
        throw new Meteor.Error('err_databaseWriteFailed', 'Database write failed',
        `Method: topics.update, userId: ${this.userId}, topicId: ${topicId}`);
      }
      debugAssert(res === 1);
    });
  },
});

const TOPIC_ID_ONLY = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
}).validator();

export const remove = new ValidatedMethod({
  name: 'topics.remove',
  validate: TOPIC_ID_ONLY,

  run({ topicId }) {
    const topic = Topics.findOne(topicId);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.remove, Collection: topics, id: ${topicId}`
      );
    }

    if (!topic.editableBy(this.userId)) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.remove, userId: ${this.userId}, topicId: ${topicId}`);
    }

    // XXX the security check above is not atomic, so in theory a race condition could
    // result in exposing private data

    Topics.remove(topicId, function handle(err, res) {
      if (err) {
        throw new Meteor.Error('err_databaseWriteFailed', 'Database write failed',
        `Method: topics.remove, userId: ${this.userId}, topicId: ${topicId}`);
      }
      debugAssert(res === 1);
    });
  },
});

export const castVote = new ValidatedMethod({
  name: 'topics.castVote',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    membershipId: { type: String, regEx: SimpleSchema.RegEx.Id },
    castedVote: { type: Array },    // has one element if type is yesno, multiple if preferential
    'castedVote.$': { type: Number },
  }).validator(),

  run({ topicId, membershipId, castedVote }) {
    const topic = Topics.findOne(topicId);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.castVote, Collection: topics, id: ${topicId}`
      );
    }
    const membership = Memberships.findOne(membershipId);
    if (!membership) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.castVote, Collection: memberships, id: ${membershipId}`
      );
    }

    if (membership.userId !== this.userId) {         // TODO meghatalmazassal is lehet
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.castVote, userId: ${this.userId}, topicId: ${topicId}`);
    }

    // TODO:  use permissions system to determine if user has permission
    // const user = Meteor.users.findOne()

    if (membership.communityId !== topic.communityId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.castVote, userId: ${this.userId}, topicId: ${topicId}`);
    }

    if (membership.role !== 'owner') {
      throw new Meteor.Error('voting.accessDenied',
        'Role has no voting power.',
        `Active role is ${membership.role}`
      );
    }

    const topicModifier = {};
    topicModifier['$set'] = {};
    topicModifier['$set']['voteResults.' + membershipId] = castedVote;

    // If there is already a vote, then owner is changing his vote now.
    const oldVote = topic.voteResults && topic.voteResults[membershipId];
    if (!oldVote) {
      topicModifier['$inc'] = {
        'vote.participationCount': 1,
        'vote.participationShares': membership.ownership.share,
      };
    }

    Topics.update(topicId, topicModifier, function handle(err, res) {
      if (err) {
        throw new Meteor.Error('err_databaseWriteFailed', 'Database write failed',
        `Method: topics.castVote, userId: ${this.userId}, topicId: ${topicId}`);
      }
      debugAssert(res === 1);
    });
  },
});

// Get list of all method names on Topics
const TOPICS_METHOD_NAMES = _.pluck([
  insert,
  update,
  remove,
  castVote,
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
