/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Parcelships } from './parcelships.js';

Meteor.publish('parcelships.inCommunity', function parcelshipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);

  if (!user.hasPermission('parcelships.inCommunity', { communityId })) {
    return this.ready();
  }

  return Parcelships.find({ communityId });
});

Meteor.publish('parcelships.ofParcel', function parcelshipsofParcel(params) {
  new SimpleSchema({
    parcelId: { type: String },
  }).validate(params);

  const { parcelId } = params;
  const parcel = Parcels.findOne(parcelId);
  const user = Meteor.users.findOneOrNull(this.userId);

  if (!user.hasPermission('parcelships.inCommunity', { communityId: parcel.communityId })) {
    return this.ready();
  }

  return Parcelships.find({ parcelId });
});
