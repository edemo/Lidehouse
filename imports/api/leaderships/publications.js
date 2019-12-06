/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Leaderships } from './leaderships.js';

Meteor.publish('leaderships.inCommunity', function leadershipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOne(this.userId);

  if (!user || !user.hasPermission('leaderships.inCommunity', communityId)) {
    return this.ready();
  }

  return Leaderships.find({ communityId });
});
