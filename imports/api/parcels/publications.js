/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
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

Meteor.publish('parcels.ofSelf', function parcelsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  if (!Meteor.user()) return this.ready();
  const parcelIds = Meteor.user().memberships(communityId).map(m => m.parcelId);
  const ledParcelIds = [];
  parcelIds.forEach((parcelId) => {
    if (parcelId === undefined) return;
    Parcels.findOne(parcelId).forEachLed(parcel => ledParcelIds.push(parcel._id));
  });
  return Parcels.find({ _id: { $in: ledParcelIds } });
});
