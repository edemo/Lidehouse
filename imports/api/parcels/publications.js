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
  
  return Parcels.find({ communityId });
});

Meteor.publishComposite('parcels.ofSelf', function parcelsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!Meteor.user()) return this.ready();
  const { communityId } = params;
  const permissionRoles = Permissions.find(p => p.name === 'parcels.details').roles;
  const personId = Meteor.userId();
  const parcelIds = Memberships.find({ communityId, approved: true, active: true,
    personId, parcelId: { $exists: true }, role: { $in: permissionRoles } }).map(m => m.parcelId);
  const ledParcelIds = [];
  parcelIds.forEach((parcelId) => {
    Parcels.findOne(parcelId).forEachLed(parcel => ledParcelIds.push(parcel._id));
  });

  return {
    find() {
      return Parcels.find({ _id: { $in: ledParcelIds } });
    },
    children: [{
      // Publish the Meters of the Parcel
      find(parcel) {
        return Meters.find({ parcelId: parcel._id });
      },
    }],
  };
});
