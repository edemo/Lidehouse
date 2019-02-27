import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';

import { Person } from '/imports/api/users/person.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { autoformOptions, noUpdate } from '/imports/utils/autoform.js';
import { Topics } from '/imports/api/topics/topics.js';

Topics.voteProcedureValues = ['online', 'meeting'];
Topics.voteEffectValues = ['poll', 'legal'];
Topics.voteTypeValues = ['yesno', 'choose', 'preferential', 'petition'];
Topics.voteTypeChoices = {
  'yesno': ['yes', 'no', 'abstain'],
  'petition': ['support'],
};

let currentUsersPossibleEffectValues = () => Topics.voteEffectValues;
if (Meteor.isClient) {
  import { Session } from 'meteor/session';

  currentUsersPossibleEffectValues = function() {
    const user = Meteor.user();
    if (!user.hasPermission('vote.insert', Session.get('activeCommunityId'))) {
      return ['poll'];
    }
    return Topics.voteEffectValues;      
  }
}

const voteSchema = new SimpleSchema({
  closesAt: { type: Date, autoform: noUpdate },
  procedure: { type: String, allowedValues: Topics.voteProcedureValues, autoform: _.extend({}, autoformOptions(Topics.voteProcedureValues, 'schemaVotings.vote.procedure.'), noUpdate) },
  effect: { type: String, allowedValues: Topics.voteEffectValues, autoform: _.extend({}, autoformOptions(currentUsersPossibleEffectValues, 'schemaVotings.vote.effect.'), noUpdate) },
  type: { type: String, allowedValues: Topics.voteTypeValues, autoform: _.extend({}, autoformOptions(Topics.voteTypeValues, 'schemaVotings.vote.type.'), noUpdate) },
  choices: { type: Array, autoValue() { return Topics.voteTypeChoices[this.field('vote.type').value]; } },
  'choices.$': { type: String },
});

const voteParticipationSchema = new SimpleSchema({
  count: { type: Number },
  units: { type: Number, decimal: true /* so that partial owned units are OK to vote */ },
});

// How to create default value for votes only (but not for any other topics)
function defaultsTo(val) {
  const defaultValue = val;
  return function defaultValueGiverFunction() {
    if (this.isInsert && this.field('category').value === 'vote') {
      return defaultValue;
    }
    return undefined;
  };
}

const votingsExtensionSchema = new SimpleSchema({
  vote: { type: voteSchema, optional: true },
  voteCasts: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
  voteCastsIndirect: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // userId -> ranked array of choice indexes (or single entry in the array)
  voteResults: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // ownershipId -> {}
  voteSummary: { type: Object, optional: true, autoValue: defaultsTo({}), blackbox: true },
    // choiceIndex -> {}
  voteParticipation: { type: voteParticipationSchema, optional: true, autoValue: defaultsTo({ count: 0, units: 0 }) },
});

Topics.helpers({
  voteTypeIs(type) {
    if (!this.vote) return undefined;
    return (this.vote.type === type);
  },
  unitsToShare(units) {
    const votingShare = new Fraction(units, this.community().totalunits);
    return votingShare;
  },
  voteSuccessLimit() {
    return this.vote.type === 'petition' ? 10 : 50;
  },
  eligibleVoterCount() {
//    return Memberships.find({ communityId: this.communityId, role: 'owner' }).count();
    return Parcels.find({ communityId: this.communityId }).count();
  },
  votedCount() {
    return this.voteParticipation.count;
  },
  votedPercent() {
    const voteParticipationShare = this.unitsToShare(this.voteParticipation.units);
    const voteParticipationPercent = 100 * voteParticipationShare.toNumber();
    return voteParticipationPercent;
  },
  isVoteSuccessful() {
    return this.votedPercent() >= this.voteSuccessLimit();
  },
  notVotedUnits() {
    return this.community().totalunits - this.voteParticipation.units;
  },
  notVotedPercent() {
    const nonParticipationShare = this.unitsToShare(this.notVotedUnits());
    const nonParticipationPercent = 100 * nonParticipationShare.toNumber();
    return nonParticipationPercent;
  },
  hasVotedDirect(userId) {
    return !!(this.voteCasts && this.voteCasts[userId] && this.voteCasts[userId].length > 0);
  },
  hasVotedIndirect(userId) {
    return !!(this.voteCastsIndirect && this.voteCastsIndirect[userId] && this.voteCastsIndirect[userId].length > 0);
  },
  hasVoted(userId) {
    return this.hasVotedDirect(userId) || this.hasVotedIndirect(userId);
  },
  voteOf(userId) {
    return (this.voteCasts && this.voteCasts[userId]) || (this.voteCastsIndirect && this.voteCastsIndirect[userId]);
  },
  voteEvaluate(revealResults) {
    const results = {};         // results by ownerships
    const indirectVotes = {};   // results by users
    const summary = {};         // results by choices
    const participation = { count: 0, units: 0 };
    const directVotes = this.voteCasts || {};
    const self = this;
    const voterships = Memberships.find({ communityId: this.communityId, active: true, approved: true, role: 'owner' });
    voterships.forEach((ownership) => {
      const ownerId = ownership.Person().id();
      const votePath = [ownerId];

      function getVoteResult(voterId) {
        const castedVote = directVotes[voterId];
        if (castedVote) {
          const result = {
            votingShare: ownership.votingUnits(),
            castedVote,
            votePath,
          };
          results[ownership._id] = result;
          indirectVotes[ownerId] = castedVote;
          castedVote.forEach((choice, i) => {
            summary[choice] = summary[choice] || 0;
            summary[choice] += ownership.votingUnits() * (1 - (i / castedVote.length));
          });
          participation.count += 1;
          participation.units += ownership.votingUnits();
          return true;
        }
        const delegations = Delegations.find({ sourcePersonId: voterId,
          $or: [
            { scope: 'topic', scopeObjectId: self._id },
            { scope: 'agenda', scopeObjectId: self.agendaId },
            { scope: 'community', scopeObjectId: self.communityId },
          ],
        });
        for (const delegation of delegations.fetch()) {
          if (!_.contains(votePath, delegation.targetPersonId)) {
            votePath.push(delegation.targetPersonId);
            if (getVoteResult(delegation.targetPersonId)) return true;
            votePath.pop();
          }
        }
        return false;
      }

      getVoteResult(ownerId);
    });

    Topics.update(this._id, { $set: { voteParticipation: participation } });
//    if (!revealResults) return;
    Topics.update(this._id, { $set: { voteCastsIndirect: indirectVotes, voteResults: results, voteSummary: summary } });
  },
  voteResultsDisplay() {
    const topic = this;
    const results = this.voteResults;
    const data = [];
    Object.keys(results).forEach(key => {
      data.push(_.extend(results[key], {
        voter() {
          return Person.constructFromId(this.votePath[0]);
        },
        voteResultDisplay() {
          let display = topic.vote.choices[this.castedVote[0]];
          this.castedVote.forEach((r, i) => {
            if (i > 0) display += ', ' + topic.vote.choices[r];
          });
          return display;
        },
        votePathDisplay() {
          if (this.votePath.length === 1) return 'direct';
          let path = '';
          this.votePath.forEach((pid, ind) => { if (ind > 0) path += (' -> ' + Person.constructFromId(pid).toString()); });
          return path;
        },
      }));
    });
    return data;
  },
  voteSummaryDisplay() {
    const summary = this.voteSummary;
    return Object.keys(summary).map(key => {
      const votingShare = this.unitsToShare(summary[key]);
      return {
        choice: this.vote.choices[key],
        votingShare,
      };
    });
  },
});

Topics.attachSchema(votingsExtensionSchema);   // TODO: should be conditional on category === 'vote'

_.extend(Topics.publicFields, {
  vote: 1,
  // voteCasts should NOT be sent to the client during active voting
  voteResults: 1,
  voteSummary: 1,
  voteParticipation: 1,
});

Topics.publicFields.extendForUser = function extendForUser(userId, communityId) {
  // TODO: User cannot see other user's votes, but need to see his own votes (during active voting)
  // Soution: 2 subsrciptions, one on the live votings, one on the archived, and the public fields are different for the two

//  const publicFiledsForOwnVotes = {};
//  publicFiledsForOwnVotes['voteCasts.' + userId] = 1;
//  also for voteResults
//  const publicFields = _.extend({}, Topics.publicFields, publicFiledsForOwnVotes);
  const publicFields = _.extend({}, Topics.publicFields, { voteCasts: 1, voteCastsIndirect: 1 });
  return publicFields;
};
