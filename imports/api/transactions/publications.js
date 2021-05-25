/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from './transactions.js';

Meteor.publish('transactions.inCommunity', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }
  const selector = Transactions.makeFilterSelector(params);
  return Transactions.find(selector);
});

Meteor.publish('transactions.byPartner', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    partnerId: { type: String, optional: true },
    contractId: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, partnerId, contractId, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    // Normal user can only see his own parcels' transactions
    if (!partnerId) return this.ready();
    if (partnerId && Partners.findOne(partnerId).userId !== this.userId) return this.ready();
  }
  const selector = Transactions.makeFilterSelector(params);
  return Transactions.find(selector);
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
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }

  const selector = Transactions.makeFilterSelector(params);
  return Transactions.find(selector);
});

Meteor.publish('transactions.betweenAccounts', function transactionsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    defId: { type: String },
    creditAccount: { type: String, optional: true },
    debitAccount: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, defId, creditAccount, debitAccount, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }

  const selector = Transactions.makeFilterSelector(params);
  return Transactions.find(selector);
});

//---------------------------

function findTxsWithRelatedStuff(selector, options) {
  return {
    find() {
      return Transactions.find(selector, options);
    },
    children: [{
      find(tx) {
        if (tx.category === 'bill') // return Payments with the Bills
          return Transactions.find({ 'bills.id': tx._id });
      },
    }, {
      find(tx) {
        if (tx.category === 'payment') // return Bills with the Payments
          return Transactions.find({ 'payments.id': tx._id });
      },
    }],
  };
}

Meteor.publishComposite('transactions.byId', function transactionsById(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  if (!this.userId) return this.ready();
  const user = Meteor.users.findOne(this.userId);
  const tx = Transactions.findOne(_id);
  if (!user.hasPermission('transactions.inCommunity', tx)
    && user.partnerId(tx.communityId) !== tx.partnerId) {
    return this.ready();
  }
  return findTxsWithRelatedStuff({ _id });
});
/*
Meteor.publish('transactions.unreconciled', function transactionsUnreconciled(params) {
  new SimpleSchema({
    communityId: { type: String },
    category: { type: String, optional: true },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }
  return Transactions.find(_.extend({}, params, { reconciled: false }));
});

Meteor.publish('transactions.outstanding', function transactionsOutstanding(params) {
  new SimpleSchema({
    communityId: { type: String },
    category: { type: String, optional: true },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('transactions.inCommunity', { communityId })) {
    return this.ready();
  }
  return Transactions.find(_.extend({}, params, { outstanding: { $gt: 0 } }));
});
*/
