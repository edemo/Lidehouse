/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Reviews } from './reviews.js';

Meteor.publish('reviews.inCommunity', function reviewsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('reviews.inCommunity', { communityId })) {
    return this.ready();
  }
  return Reviews.find({ communityId });
});