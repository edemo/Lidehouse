/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Memberships } from './memberships.js';
import { Communities } from '../communities/communities.js';

Meteor.publishComposite('memberships.ofUser', function membershipsOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;
  if (userId !== this.userId) {
    return this.ready();
  }
  const user = Meteor.users.findOne(userId);
  const userEmail = user.emails[0].address;

  return {
    find() {
      return Memberships.find({ personId: userId });
    },

    children: [{
      find(membership) {
        const communityId = membership.communityId;
       // const user = Meteor.users.findOne(this.userId);
       // const visibleFields = user.hasPermission('finances.view') ? {} : { finances: 0 };
        return Communities.find({ _id: communityId } /* , { fields: visibleFields } */);
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
      if (user.hasPermission('memberships.inCommunity', communityId)) {
        const fields = user.hasPermission('memberships.details', communityId) ? {} : Memberships.publicFields;
        return Memberships.find({ communityId }, { fields });
      } // Otherwise, only the active leaders of the community can be seen
      return Memberships.find({ communityId, active: true, role: { $in: leaderRoles } }, { fields: Memberships.publicFields });
    },

    children: [{
      // Publish the User of the Membership
      find(membership) {
        const showFields = _.extend({}, Meteor.users.publicFields);
        if (user.hasPermission('memberships.details', communityId)) showFields.emails = 1;  // to be able to resend invites
        return Meteor.users.find({ _id: membership.person.userId }, { fields: showFields });
      },
    }],
  };
});
