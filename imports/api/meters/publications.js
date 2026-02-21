/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { MeterReadings } from './meter-readings/meter-readings.js';
import { Meters } from './meters.js';

Meteor.publishComposite('meters.inCommunity', function metersInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('meters.inCommunity', { communityId })) {
    return this.ready();
  }
  
  return {
    find() {
      return Meters.find({ communityId });
    },
    children: [{
      find(meter) {
        return MeterReadings.find({ meterId: meter._id });
      },
    }],
  };
});

Meteor.publishComposite('meters.ofParcels', function metersOfParcel(params) {
  new SimpleSchema({
    parcelIds: { type: [String], regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { parcelIds } = params;
  let parcels = Parcels.find({ _id: { $in: parcelIds } }).fetch();

  const user = Meteor.users.findOneOrNull(this.userId);
  parcels = parcels.filter(p => user.hasPermission('parcels.details', p));
  if (!parcels.length) return this.ready();
  
  return {
    find() {
      return Meters.find({ parcelId: { $in: parcelIds } });
    },
    children: [{
      find(meter) {
        return MeterReadings.find({ meterId: meter._id });
      },
    }],
  };
});
