/* eslint-disable prefer-arrow-callback */
/* globals check */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Topics } from './topics.js';
import { Memberships } from '../memberships/memberships.js';

// TODO: If you pass in a function instead of an object of params, it passes validation
Meteor.publish('topics.inCommunity', function topicsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  // User cannot see other user's votes, but need to see his own votes
  const publicFiledsForOwnVotes = {};
  const usersOwnershipIds = Memberships.find({ userId: this.userId, communityId, role: 'owner' }).map(m => m._id);
  usersOwnershipIds.forEach(function addToPublic(id) { publicFiledsForOwnVotes['voteResults.' + id] = 1; });
  const publicFields = _.extend({}, Topics.publicFields, publicFiledsForOwnVotes);

  return Topics.find({ communityId }, { fields: publicFields });
});
