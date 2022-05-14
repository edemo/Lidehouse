import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { checkExists, checkNeededStatus, checkPermissions, checkConstraint } from '/imports/api/method-checks.js';
import { debugAssert } from '/imports/utils/assert.js';

import { Topics } from '/imports/api/topics/topics.js';
import './votings.js';
import { voteCastConfirmationEmail } from '/imports/email/voting-confirmation.js';

export const addChoice = new ValidatedMethod({
  name: 'vote.addChoice',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    text: { type: String, max: 50 },
  }).validator(),

  run({ topicId, text }) {
    const topic = checkExists(Topics, topicId);
    checkPermissions(this.userId, 'vote.addChoice', topic);
    checkConstraint(topic.vote.allowAddChoices, 'Voting does not allow adding choices');
    checkNeededStatus(topic, 'announced', 'opened');

    const choices = topic.vote.choices;
    const choicesAddedBy = topic.vote.choicesAddedBy || [];
    choices.push(text);
    choicesAddedBy[choices.length - 1] = this.userId;
    const topicModifier = { $set: { 'vote.choices': choices, 'vote.choicesAddedBy': choicesAddedBy } };

    return Topics.update(topicId, topicModifier, { selector: { category: 'vote' } });
  },
});

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
    checkNeededStatus(topic, 'opened');
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
