/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from './journals.js';
import { Breakdowns } from './breakdowns/breakdowns.js';
// import { Txs } from './txs.js';
// import { TxDefs } from './tx-defs.js';

Meteor.publish('journals.byId', function journalsInCommunity(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const tx = Journals.findOne(_id);
  if (!user.hasPermission('journals.inCommunity', tx.communityId)) {
    return this.ready();
  }
  return Journals.find({ _id });
});

Meteor.publish('journals.byAccount', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    localizer: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, account, localizer, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    return this.ready();
  }
  if ((account && localizer) || (!account && !localizer)) {
    throw new Meteor.Error('invalid subscription');
  }

  const selector = { communityId, valueDate: { $gte: begin, $lt: end } };
  if (account) selector.$or = [{ 'credit.account': account }, { 'debit.account': account }];
  if (localizer) selector.$or = [{ 'credit.localizer': localizer }, { 'debit.localizer': localizer }];

  return Journals.find(selector);
});

Meteor.publish('journals.betweenAccounts', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    creditAccount: { type: String, optional: true },
    debitAccount: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, creditAccount, debitAccount, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    return this.ready();
  }

  const selector = { communityId, valueDate: { $gte: begin, $lt: end } };
  const coa = Breakdowns.chartOfAccounts(communityId);
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
  return Journals.find(selector);
});

Meteor.publish('journals.incomplete', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    return this.ready();
  }
  return Journals.find({ communityId, complete: false });
});
