/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TxCats } from './tx-cats.js';

Meteor.publish('txCats.inCommunity', function txCatsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('txCats.inCommunity', { communityId })) {
    return this.ready();
  }

  return TxCats.find({ communityId: { $in: [communityId, null] } });
});
