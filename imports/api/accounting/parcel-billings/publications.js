/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { ParcelBillings } from './parcel-billings.js';

Meteor.publish('parcelBillings.inCommunity', function parcelBillingsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcelBillings.inCommunity', { communityId })) {
    return this.ready();
  }

  return ParcelBillings.find({ communityId });
});
