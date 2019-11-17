/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Transactions } from './transactions.js';

function findTransactionsWithTypeExtension(selector) {
  return {
    find() {
      return Transactions.find(selector);
    },
    children: [{
      find(tx) {
        return Mongo.Collection.get(tx.dataType).find(tx._id);
      },
    }],
  };
}

Meteor.publishComposite('transactions.byId', function transactionsInCommunity(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const tx = Transactions.findOne(_id);
  if (!user.hasPermission('transactions.inCommunity', tx.communityId)) {
    return this.ready();
  }
  return findTransactionsWithTypeExtension({ _id });
});

Meteor.publishComposite('transactions.byPartner', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    partnerId: { type: String },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, partnerId, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', communityId)) {
    // then he can only see his own parcels' transactions
    const ownershipIds = user.ownerships(communityId).map(membership => membership._id);
    if (!partnerId || !_.contains(ownershipIds, partnerId)) {
      return this.ready();
    }
  }

  const selector = Transactions.makeFilterSelector(params);
  return findTransactionsWithTypeExtension(selector);
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

  const selector = Transactions.makeFilterSelector(params);
  return Transactions.find(selector);
});

Meteor.publish('transactions.betweenAccounts', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    catId: { type: String },
    creditAccount: { type: String, optional: true },
    debitAccount: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, catId, creditAccount, debitAccount, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', communityId)) {
    return this.ready();
  }

  const selector = Transactions.makeFilterSelector(params);
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
  return Transactions.find({ communityId, complete: false }, { limit: 100 });
});
