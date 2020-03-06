/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from './accounts.js';

Meteor.publish('accounts.inCommunity', function moneyAccountsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('accounts.inCommunity', { communityId })) {
    return this.ready();
  }

  return Accounts.find({ communityId }, { sort: { code: 1 } });
});
