/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from './transactions.js';

Meteor.publish('transactions.byId', function transactionsInCommunity(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const tx = Transactions.findOne(_id);
  if (!user.hasPermission('transactions.inCommunity', tx.communityId)) {
    return this.ready();
  }
  return Transactions.find({ _id });
});

Meteor.publish('transactions.byAccount', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    localizer: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, account, localizer, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', communityId)) {
    // then he can only see his own parcels' transactions
    const parcelCodes = user.ownedParcels(communityId).map(p => Localizer.parcelRef2code(p.ref));
    if (!localizer || !_.contains(parcelCodes, localizer)) {
      return this.ready();
    }
  }
  if ((account && localizer) || (!account && !localizer)) {
    throw new Meteor.Error('invalid subscription');
  }

  const selector = { communityId, valueDate: { $gte: begin, $lt: end } };
  if (account) selector.$or = [{ 'credit.account': account }, { 'debit.account': account }];
  if (localizer) selector.$or = [{ 'credit.localizer': localizer }, { 'debit.localizer': localizer }];

  return Transactions.find(selector);
});

Meteor.publish('transactions.betweenAccounts', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    creditAccount: { type: String, optional: true },
    debitAccount: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, creditAccount, debitAccount, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', communityId)) {
    return this.ready();
  }

  const selector = { communityId, valueDate: { $gte: begin, $lt: end } };
  const coa = ChartOfAccounts.get(communityId);
  if (creditAccount) {
    const creditNode = coa.nodeByCode(creditAccount);
    const creditLeafs = creditNode.leafs().map(l => l.code);
    selector['credit.account'] = { $in: creditLeafs };
  }
  if (debitAccount) {
    const debitNode = coa.nodeByCode(debitAccount);
    const debitLeafs = debitNode.leafs().map(l => l.code);
    selector['debit.account'] = { $in: debitLeafs };
  }
  return Transactions.find(selector);
});

Meteor.publish('transactions.incomplete', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', communityId)) {
    return this.ready();
  }
  return Transactions.find({ communityId, complete: false });
});
