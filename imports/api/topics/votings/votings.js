import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { Topics } from '../topics.js';
import { Memberships } from '../../memberships/memberships.js';
import { Delegations } from '../../delegations/delegations.js';

const voteSchema = new SimpleSchema({
  closesAt: { type: Date },
  type: { type: String, allowedValues: ['yesno', 'select', 'preferential'] },
  choices: { type: Array, autoValue() { if (this.field('vote.type').value === 'yesno') return ['yes', 'no', 'abstain']; } },
  'choices.$': { type: String },
});

const voteParticipationSchema = new SimpleSchema({
  count: { type: Number },
  units: { type: Number, decimal: true /* so that partial owned units are OK to vote */ },
});

const votingsExtensionSchema = new SimpleSchema({
  vote: { type: voteSchema, optional: true },
  voteCasts: { type: Object, optional: true, blackbox: true },
  voteCastsIndirect: { type: Object, optional: true, blackbox: true },
    // userId -> ranked array of choice indexes (or single entry in the array)
  voteResults: { type: Object, optional: true, blackbox: true },
    // ownershipId -> {}
  voteSummary: { type: Object, optional: true, blackbox: true },
    // choiceIndex -> {}
  voteParticipation: {
    type: voteParticipationSchema,
    optional: true,
    autoValue() {
      if (!this.isSet && this.isInsert && this.field('category').value === 'vote') {
        return { count: 0, units: 0 };
      }
    },
  },
});

Topics.helpers({
  voteTypeIs(type) {
    if (!this.vote) return undefined;
    return (this.vote.type === type);
  },
  memberCount() {
    return Memberships.find({ communityId: this.communityId, role: 'owner' }).count();
  },
  votedCount() {
    return this.voteParticipation.count;
  },
  votedPercent() {
    const voteParticipationShares = new Fraction(this.voteParticipation.units, this.community().totalunits);
    return Math.round(100 * (voteParticipationShares.toNumber()));
  },
  hasVotedDirect(userId) {
    return !!(this.voteCasts && this.voteCasts[userId] && this.voteCasts[userId].length > 0);
  },
  hasVotedIndirect(userId) {
    return !!(this.voteCastsIndirect && this.voteCastsIndirect[userId] && this.voteCastsIndirect[userId].length > 0);
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
    const data = this;
    const voterships = Memberships.find({ communityId: this.communityId, role: 'owner' }).fetch().filter(o => o.isRepresentor());
    voterships.forEach((ownership) => {
      const votePath = [ownership.userId];

      function getVoteResult(voterId) {
        const voteResult = directVotes[voterId];
        if (voteResult) {
          const result = {
            votingShare: ownership.votingShare(),
            voteResult,
            votePath,
          };
          results[ownership.parcelId] = result;
          indirectVotes[ownership.userId] = voteResult;
          summary[voteResult] = summary[voteResult] || 0;
          summary[voteResult] += ownership.votingUnits();
          participation.count += 1;
          participation.units += ownership.votingUnits();
          return true;
        }
        const delegations = Delegations.find({ sourceUserId: voterId, scope: 'community', objectId: ownership.communityId });
        for (const delegation of delegations.fetch()) {
          votePath.push(delegation.targetUserId);
          if (getVoteResult(delegation.targetUserId)) return true;
          votePath.pop();
        }
        return false;
      }

      getVoteResult(ownership.userId);
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
          return Meteor.users.findOne(this.votePath[0]);
        },
        voteResultDisplay() {
          return topic.vote.choices[this.voteResult[0]];
        },
        votePathDisplay() {
          if (this.votePath.length === 1) return 'direct';
          let path = '';
          this.votePath.forEach((did, ind) => { if (ind > 0) path += (' -> ' + Meteor.users.findOne(did).toString()); });
          return path;
        },
      }));
    });
    return data;
  },
  voteSummaryDisplay() {
    const summary = this.voteSummary;
    return Object.keys(summary).map(key => {
      const votingShare = new Fraction(summary[key], this.community().totalunits);
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
}
