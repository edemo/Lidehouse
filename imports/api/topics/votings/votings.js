import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';
import { Memberships } from '../../memberships/memberships.js';

Topics.helpers({
  voteTypeIs(type) {
    if (!this.vote) return undefined;
    return (this.vote.type === type);
  },
  votedCount() {
    return this.vote.participationCount;
  },
  memberCount() {
    return Memberships.find({ communityId: this.communityId, role: 'owner' }).count();
  },
  voteParticipation() {
    return Math.round(100 * (this.vote.participationShares / this.community().totalshares));
  },
});

const voteSchema = new SimpleSchema({
  closesAt: { type: Date, defaultValue: moment().add(2, 'week').toDate() },
  type: { type: String, allowedValues: ['yesno', 'preferential'], defaultValue: 'yesno' },
  choices: { type: Array, defaultValue: ['yes', 'no', 'abstain'] },
  'choices.$': { type: String },
  participationCount: { type: Number, defaultValue: 0 },
  participationShares: { type: Number, defaultValue: 0 },
});

Topics.votingSchema = new SimpleSchema({
  vote: { type: voteSchema, optional: true },
  voteResults: { type: Object, blackbox: true, defaultValue: {} },
});

Topics.attachSchema(Topics.votingSchema);   // TODO: should be conditional on category === 'vote'

_.extend(Topics.publicFields, { vote: 1 });   // voteResults are NOT sent to the client

Topics.publicFields.extendForUser = function (userId, communityId) {
  // User cannot see other user's votes, but need to see his own votes
  const publicFiledsForOwnVotes = {};
  const usersOwnershipIds = Memberships.find({ userId, communityId, role: 'owner' }).map(m => m._id);
  usersOwnershipIds.forEach(function addToPublic(id) { publicFiledsForOwnVotes['voteResults.' + id] = 1; });
  const publicFields = _.extend({}, Topics.publicFields, publicFiledsForOwnVotes);
  return publicFields;
}
