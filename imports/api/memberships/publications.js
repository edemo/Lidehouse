/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Memberships } from './memberships.js';
import { Communities } from '../communities/communities.js';
import { Partners } from '../partners/partners.js';

Meteor.publishComposite('memberships.ofUser', function membershipsOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;
  if (userId !== this.userId) {
    return this.ready();
  }
//  const user = Meteor.users.findOne(userId);
//  const userEmail = user.emails[0].address;

  return {
    find() {
      return Memberships.find({ userId });
    },

    children: [{
      find(membership) {
        const communityId = membership.communityId;
        return Communities.find({ _id: communityId });
      },
    }, {
      find(membership) {
        return Partners.find({ _id: membership.partnerId }, { fields: Partners.publicFields });
      },
    }],
  };
});

Meteor.publishComposite('memberships.inCommunity', function membershipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);

  return {
    find() {
      if (user.hasPermission('memberships.inCommunity', { communityId })) {
        return Memberships.find({ communityId });
      } // Otherwise, only the active leaders of the community can be seen
      return Memberships.findActive({ communityId, role: { $in: leaderRoles } });
    },

    children: [{
      // Publish the Partners of the Membership
      find(membership) {
        return Partners.find({ _id: membership.partnerId }, { fields: Partners.publicFields });
      },
    }, {
      // Publish the User of the Membership
      find(membership) {
        return Meteor.users.find({ _id: membership.userId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});
