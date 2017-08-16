import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';
import { Topics } from '../topics.js';
import { Memberships } from '../../memberships/memberships.js';

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
