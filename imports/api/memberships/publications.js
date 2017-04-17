/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Memberships } from './memberships.js';

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
        return Meteor.users.find({ _id: membership.userId });
      },
    }],
  };
});
