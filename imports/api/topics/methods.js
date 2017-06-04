import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { _ } from 'meteor/underscore';

import { Topics } from './topics.js';
import { Memberships } from '../memberships/memberships.js';

export const insert = new ValidatedMethod({
  name: 'topics.insert',
  validate: Topics.schema.validator({ clean: true }),

  run({ doc }) {
    return Topics.insert(doc);
  },
});

export const castVote = new ValidatedMethod({
  name: 'topics.vote',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    membershipId: { type: String, regEx: SimpleSchema.RegEx.Id },
    castedVote: { type: Array },    // has one element if type is yesno, multiple if preferential
    'castedVote.$': { type: Number },
  }).validator(),

  run({ topicId, membershipId, castedVote }) {
    const topic = Topics.findOne(topicId);
    if (!topic) {
      throw new Meteor.Error('invalidId',
        'No such|topic',
        `Method: topics.vote, id: ${topicId}`
      );
    }

    const membership = Memberships.findOne(membershipId);
    if (!membership) {
      throw new Meteor.Error('invalidId',
        'No such|membership',
        `Method: topics.vote, id: ${membershipId}`
      );
    }

    if (membership.userId !== this.userId) {         // TODO meghatalmazassal is lehet
      throw new Meteor.Error('permissionDenied',
        'No permission|to vote|in the name of this membership.',
        `Method: topics.vote, userId: ${this.userId}, membershipId: ${membershipId}`);
    }

    // TODO:  use permissions system to determine if user has permission
    // const user = Meteor.users.findOne()

    if (membership.communityId !== topic.communityId) {
      throw new Meteor.Error('permissionDenied',
        'Membership has no permission to vote on this topic.',
        'Different community');
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

    Topics.update(topicId, topicModifier, function(err, res) {
      if (err) throw new Meteor.Error('databaseWriteFail', 'Database write failed in|topics.vote|update');
    });
  }
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
}).validator();

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
