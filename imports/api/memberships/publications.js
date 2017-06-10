/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Memberships } from './memberships.js';
import { Communities } from '../communities/communities.js';


Meteor.publishComposite('memberships.inCommunity', function membershipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  return {
    find() {
      return Memberships.find({ communityId });
    },

    children: [{
      find(membership) {
        return Meteor.users.find({ _id: membership.userId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});

Meteor.publishComposite('memberships.ofUser', function communitiesOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;

  return {
    find() {
      return Memberships.find({ userId });
    },

    children: [{
      find(membership) {
        return Communities.find({ _id: membership.communityId }, { fields: Communities.publicFields });
      },
    }],
  };
});
