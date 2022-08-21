/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Balances } from './balances.js';

Meteor.publish('balances.inCommunity', function balancesInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    accounts: { type: [String], optional: true },
    partners: { type: [String], optional: true }, // [] means get all, missing means don't need partner balances
    localizers: { type: [String], optional: true }, // [] means get all, missing means don't need localized balances
    tags: { type: [String], optional: true },
    notNull: { type: Boolean, optional: true }, // publish only balances with non null amount
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('balances.inCommunity', { communityId })) {
    return this.ready();
  }
  const selector = { communityId };
  if (params.accounts) selector.account = { $in: params.accounts };
  if (params.tags) selector.tag = { $in: params.tags };
  if (params.localizers) {
    if (params.localizers.length) selector.localizer = { $in: params.localizers };
    else selector.localizer = { $exists: true };
  } else selector.localizer = { $exists: false };
  if (params.partners) {
    if (params.partners.length) selector.partner = { $in: params.partners };
    else selector.partner = { $exists: true };
  } else selector.partner = { $exists: false };
  if (params.notNull) _.extend(selector, { $expr: { $ne: ['$debit', '$credit'] } });
  return Balances.find(selector);
});
