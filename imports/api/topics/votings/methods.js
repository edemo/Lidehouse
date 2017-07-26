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
    membershipId: { type: String, regEx: SimpleSchema.RegEx.Id },
    castedVote: { type: Array },    // has one element if type is yesno, multiple if preferential
    'castedVote.$': { type: Number },
  }).validator({ clean: true }),  // we 'clean' here to convert the vote strings (eg "1") into numbers (1)

  run({ topicId, membershipId, castedVote }) {
    const userId = this.userId;

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
        `Method: topics.castVote, userId: ${userId}, topicId: ${topicId}`);
    }

    // TODO:  use permissions system to determine if user has permission
    // const user = Meteor.users.findOne()

    if (membership.communityId !== topic.communityId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: topics.castVote, userId: ${userId}, topicId: ${topicId}`);
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
        'voteParticipation.count': 1,
        'voteParticipation.units': membership.votingUnits(),
      };
    }

    Topics.update(topicId, topicModifier);
  },
});
