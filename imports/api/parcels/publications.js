/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Parcels } from './parcels.js';

Meteor.publish('parcels.codes', function parcelsCodes(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const  community = Communities.findOne(communityId);

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.codes', { communityId })) {
    return this.ready();
  }

  return Parcels.find({ communityId: { $in: [communityId, community.settings.templateId] } }, { fields: { communityId: 1, category: 1, ref: 1, code: 1, name: 1 } });
});

Meteor.publishComposite('parcels.inCommunity', function parcelsOfCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const  community = Communities.findOne(communityId);

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.inCommunity', { communityId })) {
    return this.ready();
  }

  return {
    find() {
      return Parcels.find({ communityId: { $in: [communityId, community.settings.templateId] } }, { fields: Parcels.publicFields });
    },
    children: [{
      // Publish the Meters of the Parcel
      find(parcel) {
        if (!user.hasPermission('meters.inCommunity', { communityId })) {
          return this.ready();
        }
        return Meters.find({ parcelId: parcel._id }); //, { fields: { 'readings': { $slice: -1 }, 'billings': { $slice: -1 } } });
      },
    }],
  };
});

Meteor.publishComposite('parcels.ofSelf', function parcelsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!this.userId) return this.ready();
  const { communityId } = params;
  const roles = Permissions.find(p => p.name === 'parcels.details').roles;
  const permissionRoles = roles.map(role => role.split('@')[0]);
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
          return Contracts.find({ parcelId: parcel._id });
        },
      }, {
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
