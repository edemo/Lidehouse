/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Listings } from './listings.js';

Meteor.publish('listings.inCommunity', function listingsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('listings.inCommunity', { communityId })) {
    return this.ready();
  }
  return Listings.find({ communityId });
});

Meteor.publish('listings.byId', function listingsById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;
  const listing = Listings.findOne(_id);
  const communityId = listing.communityId;
  const user = Meteor.users.findOneOrNull(this.userId);

  if (!user.hasPermission('listings.inCommunity', { communityId })) return this.ready();
  return Listings.find({ _id });
});

