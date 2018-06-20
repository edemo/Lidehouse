/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Legs, Journals } from './journals.js';

Meteor.publish('journals.inCommunity', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    this.ready();
    return;
  }
  return Journals.find({ communityId });
});
