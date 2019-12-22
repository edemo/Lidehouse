/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TxDefs } from './tx-defs.js';

Meteor.publish('txDefs.inCommunity', function txDefsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('txDefs.inCommunity', { communityId })) {
    return this.ready();
  }

  return TxDefs.find({ communityId: { $in: [communityId, null] } });
});
