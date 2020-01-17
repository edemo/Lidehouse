import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNeededStatus, checkPermissions } from '/imports/api/method-checks.js';
import { debugAssert } from '/imports/utils/assert.js';

import { Topics } from '/imports/api/topics/topics.js';
import './votings.js';
import { voteCastConfirmationEmail } from '/imports/email/voting-confirmation.js';

export const castVote = new ValidatedMethod({
  name: 'vote.cast',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    castedVote: { type: Array },    // has one element if type is yesno, multiple if preferential
    'castedVote.$': { type: Number },
    voters: { type: Array, optional: true },
    'voters.$': { type: String, regEx: SimpleSchema.RegEx.Id }, // partnerId
  }).validator({ clean: true }),  // we 'clean' here to convert the vote strings (eg "1") into numbers (1)

  run({ topicId, castedVote, voters }) {
    const topic = checkExists(Topics, topicId);
    const user = Meteor.users.findOne(this.userId);
    checkNeededStatus('opened', topic);
    let _voters = voters;
    if (_voters) {
      checkPermissions(this.userId, 'vote.castForOthers', topic);
    } else {
      checkPermissions(this.userId, 'vote.cast', topic);
      const voterId = user.partnerId(topic.communityId);
      debugAssert(voterId);
      _voters = [voterId];
    }

    const topicModifier = {};
    if (castedVote.length === 0) {
      topicModifier['$unset'] = {};
      _voters.forEach(voterId => topicModifier['$unset']['voteCasts.' + voterId] = '');
    } else {
      topicModifier['$set'] = {};
      _voters.forEach(voterId => topicModifier['$set']['voteCasts.' + voterId] = castedVote);
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
    const res = Topics.update(topicId, topicModifier, { selector: { category: 'vote' } });
    debugAssert(res === 1); // should not continue if it was not successful

    if (Meteor.isServer) {
      const updatedTopic = Topics.findOne(topicId);
      updatedTopic.voteEvaluate();
      if (topic.vote.effect === 'legal') voteCastConfirmationEmail(_voters, topicId, this.userId);
    }
  },
});

export function autoOpen(topic) {
  const now = new Date();
  if (topic.status === 'announced' && topic.opensAt <= now) {
    Topics.methods.statusChange._execute({ userId: topic.creatorId },
      { userId: topic.creatorId, topicId: topic._id, status: 'opened' },
    );
  }
}

export function openScheduledVotings() {
  const dueVotings = Topics.find({ category: 'vote', status: 'announced', opensAt: { $lt: new Date() } });
  dueVotings.forEach(voting => autoOpen(voting));
}

export function closeClosableVotings() {
  const now = new Date();
  const expiredVotings = Topics.find({ category: 'vote', status: 'opened', closesAt: { $lt: now } });
  expiredVotings.forEach(voting => Topics.methods.statusChange._execute({ userId: voting.creatorId }, // permissionwise the creator is the one closing it
    { userId: voting.creatorId, topicId: voting._id, status: 'votingFinished' },
  ));
}
