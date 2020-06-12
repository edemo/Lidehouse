/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Parcels } from './parcels.js';

Parcels.findWithRelatedDocs = function (...args) {
  return {
    find() {
      return Parcels.find(...args);
    },
    children: [{
      // Publish the Meters of the Parcel
      find(parcel) {
        return Meters.find({ parcelId: parcel._id });
      },
    }],
  };
};

Meteor.publish('parcels.codes', function parcelsCodes(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.codes', { communityId })) {
    return this.ready();
  }

  return Parcels.find({ communityId }, { fields: { communityId: 1, ref: 1, code: 1, name: 1 } });
});

Meteor.publishComposite('parcels.inCommunity', function parcelsOfCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.inCommunity', { communityId })) {
    return this.ready();
  }

  return Parcels.findWithRelatedDocs({ communityId }, { fields: Parcels.publicFields });
});

Meteor.publishComposite('parcels.outstanding', function parcelsOutstanding(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    limit: { type: Number, decimal: true, optional: true },
  }).validate(params);
  const { communityId, limit } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }

  return Parcels.findWithRelatedDocs({ communityId }, { sort: { outstanding: -1 }, limit });
});

Meteor.publishComposite('parcels.ofSelf', function parcelsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!this.userId) return this.ready();
  const { communityId } = params;
  const permissionRoles = Permissions.find(p => p.name === 'parcels.details').roles;
  return {
    find() {
      return Memberships.findActive({ communityId, approved: true,
        userId: this.userId, parcelId: { $exists: true }, role: { $in: permissionRoles } });
    },
    children: [{
      find(membership) {
        const parcelId = membership.parcelId;
        return Parcels.find(parcelId);
      },
      children: [{
        find(parcel) {
          return Contracts.find({ leadParcelId: parcel._id });
        },
        children: [{
          find(contract) {
            return Parcels.find(contract.parcelId);
          },
          children: [{
            // Publish the Meters of the followerParcel
            find(parcel) {
              return Meters.find({ parcelId: parcel._id });
            },
          }],
        }],
      }, {
        // Publish the Meters of the Parcel
        find(parcel) {
          return Meters.find({ parcelId: parcel._id });
        },
      }],
    }],
  };
});
