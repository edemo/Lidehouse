/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Breakdowns } from './breakdowns.js';

Meteor.publish('breakdowns.inCommunity', function breakdownsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('breakdowns.inCommunity', communityId)) {
    return this.ready();
  }

  return Breakdowns.find({ communityId: { $in: [communityId, null] } });
});
