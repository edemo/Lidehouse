/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Txdefs } from './txdefs.js';

Meteor.publish('txdefs.inCommunity', function txdefsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('txdefs.inCommunity', { communityId })) {
    return this.ready();
  }

  return Txdefs.find({ communityId: { $in: [communityId, null] } });
});
