/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Legs, Payments } from './payments.js';

Meteor.publish('payments.inCommunity', function paymentsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('payments.inCommunity', communityId)) {
    this.ready();
    return;
  }
  return Payments.find({ communityId });
});

Meteor.publish('legs.inCommunity', function legsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('payments.inCommunity', communityId)) {
    this.ready();
    return;
  }
  return Legs.find({ communityId });
});

