import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

import { Topics } from '../topics.js';
import './votings.js';
import { Memberships } from '../../memberships/memberships.js';

export const castVote = new ValidatedMethod({
  name: 'topics.castVote',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    castedVote: { type: Array },    // has one element if type is yesno, multiple if preferential
    'castedVote.$': { type: Number },
  }).validator({ clean: true }),  // we 'clean' here to convert the vote strings (eg "1") into numbers (1)

  run({ topicId, castedVote }) {
    const topic = Topics.findOne(topicId);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.castVote, Collection: topics, id: ${topicId}`
      );
    }

    const user = Meteor.users.findOne(this.userId);
    if (!user.isInCommunity(topic.communityId)) {         // TODO meghatalmazassal is lehet?
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.castVote, userId: ${this.userId}, topicId: ${topicId}`);
    }

    // TODO:  use permissions system to determine if user has permission
    // const user = Meteor.users.findOne()

    const topicModifier = {};
    if (castedVote.length === 0) {
      topicModifier['$unset'] = {};
      topicModifier['$unset']['voteCasts.' + this.userId] = '';
    } else {
      topicModifier['$set'] = {};
      topicModifier['$set']['voteCasts.' + this.userId] = castedVote;
    }

    if (Meteor.isClient) {  // a quick'n'dirty update on the client, before the calculation from server comes back
      const oldVote = topic.voteCasts && topic.voteCasts[this.userId];
      if (!oldVote) {       // If there is already a vote, then owner is changing his vote now.
        topicModifier['$inc'] = {
          'voteParticipation.count': 1,
          'voteParticipation.units': user.votingUnits(topic.communityId),
        };
      }
    }

    const res = Topics.update(topicId, topicModifier);
    debugAssert(res === 1);

    if (Meteor.isServer) {
      const updatedTopic = Topics.findOne(topicId);
      updatedTopic.voteEvaluate(false); // writes only voteParticipation, no results
    }
  },
});

export const closeVote = new ValidatedMethod({
  name: 'topics.closeVote',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator({ clean: true }),  // we 'clean' here to convert the vote strings (eg "1") into numbers (1)

  run({ topicId }) {
    const topic = Topics.findOne(topicId);
    if (!topic) {
      throw new Meteor.Error('err_invalidId', 'No such object',
        `Method: topics.castVote, Collection: topics, id: ${topicId}`
      );
    }
//    if (!topic.editableBy(this.userId)) {
//      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
//        `Method: topics.update, userId: ${this.userId}, topicId: ${topicId}`);
//    }
    if (topic.closed) {
      throw new Meteor.Error('err_invalidOperation', 'Topic already closed',
        `Method: topics.closeVote, Collection: topics, id: ${topicId}`
      );
    }

    const res = Topics.update(topicId, { $set: { closed: true } });
    debugAssert(res === 1);

    if (Meteor.isServer) {
      topic.voteEvaluate(true); // writes results out into voteResults and voteSummary
    }
  },
});
