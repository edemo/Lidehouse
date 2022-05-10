/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Parcels } from './parcels.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';

Meteor.publish('parcels.codes', function parcelsCodes(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.codes', { communityId })) {
    return this.ready();
  }

  return Parcels.find({ communityId }, { fields: { communityId: 1, category: 1, ref: 1, code: 1, name: 1 } });
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

  return {
    find() {
      return Parcels.find({ communityId }, { fields: Parcels.publicFields });
    },
    children: [{
      // Publish the Meters of the Parcel
      find(parcel) {
        if (!user.hasPermission('meters.inCommunity', { communityId })) {
          return this.ready();
        }
        return Meters.find({ parcelId: parcel._id });
      },
    }],
  };
});

Meteor.publishComposite('parcels.outstanding', function parcelsOutstanding(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    selector: { type: String, allowedValues: ['localizer', 'partner'] },
    debtorsOnly: { type: Boolean, optional: true },
  }).validate(params);
  const { communityId, selector, debtorsOnly } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }

  const finderSelector = { communityId, [selector]: { $exists: true } };
  if (debtorsOnly) _.extend(finderSelector, { $expr: { $ne: ['$debit', '$credit'] } });

  if (selector === 'partner') {
    return {
      find() {
        return Balances.find(finderSelector);
      },
      children: [{
        find(balance) {
          return Contracts.find({ partnerId: balance.partner.substring(0, 17), parcelId: { $exists: true } });
        },
        children: [{
          find(contract) {
            return Parcels.find(contract.parcelId);
          },
          children: [{
            find(parcel) {
              return Meters.find({ parcelId: parcel._id });
            },
          }],
        }],
      }],
    };
  } else if (selector === 'localizer') {
    return {
      find() {
        return Balances.find(finderSelector);
      },
      children: [{
        find(balance) {
          return Parcels.find({ communityId, code: balance.localizer });
        },
        children: [{
          find(parcel) {
            return Meters.find({ parcelId: parcel._id });
          },
        }],
      }],
    };
  }
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
