/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Permissions } from '/imports/api/permissions/permissions.js';
import { Meters } from './meters.js';
/*
Meteor.publish('meters.inCommunity', function metersInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('meters.inCommunity', { communityId })) {
    return this.ready();
  }
  
  return Meters.find({ communityId });
});
*/