import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNotExists, checkPermissions } from '/imports/api/method-checks.js';
import { debugAssert } from '/imports/utils/assert.js';

import { Topics } from '../topics.js';
import './votings.js';

export const castVote = new ValidatedMethod({
  name: 'vote.cast.update',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    castedVote: { type: Array },    // has one element if type is yesno, multiple if preferential
    'castedVote.$': { type: Number },
  }).validator({ clean: true }),  // we 'clean' here to convert the vote strings (eg "1") into numbers (1)

  run({ topicId, castedVote }) {
    const topic = checkExists(Topics, topicId);
    checkPermissions(this.userId, 'vote.cast.update', topic.communityId, topic);

    const topicModifier = {};
    if (castedVote.length === 0) {
      topicModifier['$unset'] = {};
      topicModifier['$unset']['voteCasts.' + this.userId] = '';
    } else {
      topicModifier['$set'] = {};
      topicModifier['$set']['voteCasts.' + this.userId] = castedVote;
    }
/*
    if (Meteor.isClient) {  // a quick'n'dirty update on the client, before the calculation from server comes back
      const oldVote = topic.voteCasts && topic.voteCasts[this.userId];
      if (!oldVote) {       // If there is already a vote, then owner is changing his vote now.
        topicModifier['$inc'] = {
          'voteParticipation.count': 1,
          'voteParticipation.units': user.votingUnits(topic.communityId),
        };
      }
    }
*/
    const res = Topics.update(topicId, topicModifier);
    debugAssert(res === 1);

    if (Meteor.isServer) {
      const updatedTopic = Topics.findOne(topicId);
      updatedTopic.voteEvaluate(false); // writes only voteParticipation, no results
    }
  },
});

export const closeVote = new ValidatedMethod({
  name: 'vote.close.update',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator({ clean: true }),  // we 'clean' here to convert the vote strings (eg "1") into numbers (1)

  run({ topicId }) {
    const topic = checkExists(Topics, topicId);
    if (topic.closed) {
      throw new Meteor.Error('err_invalidOperation', 'Topic already closed',
        `Method: topics.closeVote, Collection: topics, id: ${topicId}`
      );
    }
    checkPermissions(this.userId, 'vote.close.update', topic.communityId, topic);

    const res = Topics.update(topicId, { $set: { closed: true } });
    debugAssert(res === 1);

    if (Meteor.isServer) {
      topic.voteEvaluate(true); // writes results out into voteResults and voteSummary
    }
  },
});
