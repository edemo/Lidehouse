/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Shareddocs } from './shareddocs.js';

Meteor.publish('shareddocs.inCommunity', function (communityId) {
  check(communityId, String);

  if (!this.userId) {
    debugAssert(false, 'Not-logged-in user accessing shareddocs');
    return this.ready();
  }

  const user = Meteor.users.findOne(this.userId);
  if (!user.hasPermission('shareddocs.download', communityId)) {
    debugAssert(false, 'Unpermissioned user accessing shareddocs');
    return this.ready();
  }

  return Shareddocs.find({ communityId });
});
