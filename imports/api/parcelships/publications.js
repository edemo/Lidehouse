/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Parcelships } from './parcelships.js';

Meteor.publish('parcelships.inCommunity', function parcelshipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOne(this.userId);

  if (!user || !user.hasPermission('parcelships.inCommunity', { communityId })) {
    return this.ready();
  }

  return Parcelships.find({ communityId });
});
