/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from '../communities.js';
import { Memberships } from '../../memberships/memberships.js';

Meteor.publish('communities.listing', function communitiesListing() {
  return Communities.find({}, {
    fields: Communities.publicFields,
  });
});

Meteor.publishComposite('communities.ofUser', function communitiesOfUser(params) {
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
