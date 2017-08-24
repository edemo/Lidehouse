/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// import { Communities } from '../communities/communities.js';
import { PayAccounts } from './payaccounts.js';
import { Payments } from './payments.js';

Meteor.publish('payaccounts.inCommunity', function payaccountsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  return PayAccounts.find({ communityId });
});

Meteor.publish('payments.inCommunity', function paymentsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  return Payments.find({ communityId });
});
