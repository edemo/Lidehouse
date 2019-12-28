/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { MoneyAccounts } from './money-accounts.js';

Meteor.publish('moneyAccounts.inCommunity', function moneyAccountsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('moneyAccounts.inCommunity', { communityId })) {
    return this.ready();
  }

  return MoneyAccounts.find({ communityId });
});
