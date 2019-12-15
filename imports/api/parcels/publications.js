/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Parcels } from '../parcels/parcels.js';

Meteor.publish('parcels.inCommunity', function parcelsOfCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.inCommunity', communityId)) {
    return this.ready();
  }

  return Parcels.find({ communityId }, { fields: { outstanding: 0 } });
});

Meteor.publish('parcels.outstanding', function parcelsOutstanding(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    limit: { type: Number, decimal: true, optional: true },
  }).validate(params);
  const { communityId, limit } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('bills.outstanding', communityId)) {
    return this.ready();
  }

  return Parcels.find({ communityId }, { sort: { outstanding: -1 }, limit });
});

Meteor.publishComposite('parcels.ofSelf', function parcelsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!this.userId) return this.ready();
  const { communityId } = params;
  const permissionRoles = Permissions.find(p => p.name === 'parcels.details').roles;
  const personId = this.userId;
  return {
    find() {
      return Memberships.findActive({ communityId, approved: true,
        personId, parcelId: { $exists: true }, role: { $in: permissionRoles } });
    },
    children: [{
      find(membership) {
        const parcelId = membership.parcelId;
        return Parcels.find(parcelId);
      },
      children: [{
        find(ownParcel) {
          return Parcels.find({
            communityId: ownParcel.communityId,
            $or: [{ ref: ownParcel.ref }, { leadRef: ownParcel.ref }],
          });
        },
      }],
    }],
  };
});
