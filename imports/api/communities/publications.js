/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { nullUser } from '../users/users.js';
import { Communities } from './communities.js';
import { Memberships } from '../memberships/memberships';

function visibleFields(userId, communityId) {
  const user = Meteor.users.findOneOrNull(userId);
  if (user.hasPermission('communities.details', communityId)) {
    return {};  // all fields
  }
  return Communities.publicFields;
}

Meteor.publish('communities.listing', function communitiesListing() {
  return Communities.find({}, { fields: Communities.publicFields });
});

Meteor.publishComposite('communities.byId', function communitiesById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;

  return {
    find() {
      return Communities.find({ _id }, { fields: visibleFields(this.userId, _id) });
    },

    children: [{
      find(community) {
        return Memberships.find({ communityId: community._id, role: { $in: ['admin', 'manager'] } });
      },

      children: [{
        find(membership) {
          return Meteor.users.find({ _id: membership.userId }, { fields: Meteor.users.publicFields });
        },
      }],
    }],
  };
});
