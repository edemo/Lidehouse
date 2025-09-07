/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Deals } from './deals.js';

Meteor.publish('deals.inCommunity', function dealsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('deals.inCommunity', { communityId })) {
    return this.ready();
  }
  return Deals.find({ communityId });
});
