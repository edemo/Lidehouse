/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Shareddocs } from './shareddocs.js';

Meteor.publish('shareddocs.inCommunity', function (communityId) {
  check(communityId, String);
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('shareddocs.inCommunity', communityId)) {
    return this.ready();
  }

  return Shareddocs.find({ communityId });
});
