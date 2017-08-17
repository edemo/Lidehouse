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
  type: { type: String, allowedValues: ['yesno', 'preferential'] },
  choices: { type: Array, autoValue() { if (this.field('vote.type').value === 'yesno') return ['yes', 'no', 'abstain']; } },
  'choices.$': { type: String },
});

const voteParticipationSchema = new SimpleSchema({
  count: { type: Number },
  units: { type: Number, decimal: true /* so that partial owned units are OK to vote */ },
});

const votingsExtensionSchema = new SimpleSchema({
  vote: { type: voteSchema, optional: true },
  voteResults: { type: Object, optional: true, blackbox: true },
    // ownershipId -> ranked array of choice indexes (or single entry in the array)
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
    return !!(this.voteResults && this.voteResults[userId] && this.voteResults[userId].length > 0);  // TODO
  },
  hasVoted(userId) {
    return this.hasVotedDirect(userId); // TODO
  },
  voteResultSummary() {
    const results = [];
    const summary = {};
    const directVotes = this.voteResults;
    const data = this;
    debugger;
    const ownerships = Memberships.find({ communityId: this.communityId, role: 'owner' });
    ownerships.forEach(ownership => {
      const votePath = [ownership.userId];

      function getVoteResult(voterId) {
        const choices = data.vote.choices;
        const voteResult = directVotes[voterId];
        if (voteResult) {
          results.push({
            voterId: ownership.userId,
            voteResult,
            votePath,
            voter() {
              return Meteor.users.findOne(this.voterId);
            },
            voteResultDisplay() {
              return choices[voteResult[0]];
            },
            votePathDisplay() {
              if (votePath.length === 1) return 'direct';
              let path = '';
              this.votePath.forEach((did, ind) => { if (ind > 0) path += ' -> ' + Meteor.users.findOne(did).toString(); });
              return path;
            },
          });
          summary[voteResult] = summary[voteResult] || 0;
          summary[voteResult] += ownership.votingUnits();
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
    return { results, summary };
  },
});

Topics.attachSchema(votingsExtensionSchema);   // TODO: should be conditional on category === 'vote'

_.extend(Topics.publicFields, { vote: 1, voteParticipation: 1 });   // voteResults are NOT sent to the client

Topics.publicFields.extendForUser = function (userId, communityId) {
  // User cannot see other user's votes, but need to see his own votes
  const publicFiledsForOwnVotes = {};
  publicFiledsForOwnVotes['voteResults.' + userId] = 1;
//  const publicFields = _.extend({}, Topics.publicFields, publicFiledsForOwnVotes);
  const publicFields = _.extend({}, Topics.publicFields, { voteResults: 1 });
  return publicFields;
}
