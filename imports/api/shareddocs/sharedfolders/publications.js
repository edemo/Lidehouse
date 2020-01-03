/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { debugAssert } from '/imports/utils/assert.js';
import { Sharedfolders } from './sharedfolders.js';
import { checkExists } from '/imports/api/method-checks.js';

Meteor.publish('sharedfolders.ofCommunity', function (params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('shareddocs.download', { communityId })) {
    return this.ready();
  }

  return Sharedfolders.find({ communityId: { $in: [communityId, null] } });
});
