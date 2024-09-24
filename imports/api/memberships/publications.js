/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { leaderRoles } from '/imports/api/permissions/roles.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from './memberships.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Contracts } from '/imports/api/contracts/contracts.js';

Meteor.publishComposite('memberships.ofSelf', function membershipsOfSelf() {
  return {
    find() {
      return Memberships.find({ userId: this.userId });
    },
    children: [{
      find(membership) {
        return Communities.find({ _id: membership.communityId });
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
        const fields = user.hasPermission('partners.details', { communityId }) ? {} : Memberships.publicFields;
        return Memberships.find({ communityId }, { fields });
      } // Otherwise, only the active leaders of the community can be seen
      return Memberships.findActive({ communityId, role: { $in: leaderRoles } }, { fields: Memberships.publicFields });
    },

    children: [{
      // Publish the Partners of the Membership
      find(membership) {
        const fields = user.hasPermission('partners.details', { communityId }) ? {} : Partners.publicFields;
        return Partners.find({ _id: membership.partnerId }, { fields });
      },
    }, {
      // Publish the User of the Membership
      find(membership) {
        const fields = user.hasPermission('partners.details', { communityId }) ? Meteor.users.detailedFields : Meteor.users.publicFields;
        return Meteor.users.find({ _id: membership.userId }, { fields });
      },
    }],
  };
});

Meteor.publish('memberships.byUserId', function membershipsByUserId(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { communityId, userId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('memberships.inCommunity', { communityId })) {
    this.ready();
    return undefined;
  }

  return Memberships.find({ communityId, userId }, { fields: Memberships.publicFields });
});
