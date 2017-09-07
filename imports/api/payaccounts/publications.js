/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { PayAccounts } from './payaccounts.js';

Meteor.publish('payaccounts.inCommunity', function payaccountsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  return PayAccounts.find({ communityId });
});
