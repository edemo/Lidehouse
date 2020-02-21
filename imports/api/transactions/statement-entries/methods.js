import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { namesMatch } from '/imports/utils/compare-names.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from './statement-entries.js';

export const insert = new ValidatedMethod({
  name: 'statementEntries.insert',
  validate: StatementEntries.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = StatementEntries._transform(doc);
    checkPermissions(this.userId, 'statements.insert', doc);
    const _id = StatementEntries.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'statementEntries.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(StatementEntries, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.update', doc);

    const result = StatementEntries.update({ _id }, modifier);
    return result;
  },
});

function moneyFlowSign(relation) {
  switch (relation) {
    case ('supplier'): return -1;
    case ('customer'):
    case ('member'): return +1;
    default: debugAssert(false, 'No such relation ' + relation); return undefined;
  }
}

function checkMatch(entry, transaction) {
  function throwMatchError(mismatch) {
//    console.log(JSON.stringify(entry));/
//    console.log(JSON.stringify(transaction));
    throw new Meteor.Error('err_notAllowed', `Cannot reconcile entry with transaction - ${mismatch} does not match`);
  }
  if (transaction.amount !== moneyFlowSign(transaction.relation) * entry.amount) throwMatchError('amount');
  if (transaction.valueDate.getTime() !== entry.valueDate.getTime()) throwMatchError('valueDate');
  if (!_.contains([transaction.payAccount, transaction.toAccount, transaction.fromAccount], entry.account)) throwMatchError('account');
//  if (!namesMatch(entry, transaction.partner().getName())) throwMatchError('partnerName');
}

export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: StatementEntries.reconcileSchema.validator(),
  run({ _id, txId }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (!txId) { // not present means auto match requested
      const matchingBill = Transactions.findOne({ communityId: entry.communityId, serialId: entry.note });
      if (matchingBill && matchingBill.outstanding === moneyFlowSign(matchingBill.relation) * entry.amount) {
/*
//      console.log("Looking for partner", entry.name, entry.communityId);
      const partner = Partners.findOne({ communityId: entry.communityId, 'idCard.name': entry.name });
      if (!partner) return;
//      console.log("Looking for bill");
      const matchingBill = Transactions.findOne({ category: 'bill', partnerId: partner._id, outstanding: moneyFlowSign(partner.relation) * entry.amount });
      if (!matchingBill) return;
//      console.log("Looking for payment");
      const matchingPayment = matchingBill.getPaymentTransactions().find(payment => !payment.txId && payment.amount === matchingBill.outstanding);
      if (matchingPayment) {
//        console.log("matchingPayment", matchingPayment);

        txId = matchingPayment._id;
      } else {*/
        const tx = {
          communityId: entry.communityId,
          category: 'payment',
          relation: matchingBill.relation,
          partnerId: matchingBill.partnerId,
          defId: Txdefs.findOne({ communityId: entry.communityId, category: 'payment', 'data.relation': matchingBill.relation })._id,
          valueDate: entry.valueDate,
          payAccount: entry.account,
          amount: matchingBill.outstanding,
          bills: [{ amount: matchingBill.outstanding, id: matchingBill._id }],
        };
//      console.log("Creating matchingPayment", tx);
        txId = Transactions.methods.insert._execute({ userId: this.userId }, tx);
      }
    }
    const reconciledTx = Transactions.findOne(txId);
    checkMatch(entry, reconciledTx);
    Transactions.update(reconciledTx._id, { $set: { seId: _id } });
    StatementEntries.update(entry._id, { $set: { txId } });
    return txId;
  },
});

export const autoReconciliation = new ValidatedMethod({
  name: 'statementEntries.autoReconciliation',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    StatementEntries.find({ communityId, match: { $exists: false } }).forEach(entry => {
      reconcile._execute({ userId: this.userId }, { _id: entry._id });
    });
  },
});
/*
export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  }).validator(),

  run({ _id }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (!entry.match) throw new Meteor.Error('err_notExists', 'No match provided to reconcile ' + entry._id + ' with');
    const reconciledTx = entry.match._id ? Transactions.findOne(entry.match._id) : Transactions._transform(entry.match);
    checkMatch(entry, reconciledTx);
    if (!reconciledTx._id) {
      reconciledTx._id = Transactions.methods.insert._execute({ userId: this.userId }, reconciledTx);
      Transactions.methods.post._execute({ userId: this.userId }, { _id: reconciledTx._id });
    }
    Transactions.update(reconciledTx._id, { $set: { txId: _id } });
    const result = StatementEntries.update(_id, { $set: { txId: reconciledTx._id } });
    return result;
  },
});
*/
export const remove = new ValidatedMethod({
  name: 'statementEntries.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.remove', doc);

    return StatementEntries.remove(_id);
  },
});

StatementEntries.methods = StatementEntries.methods || {};
_.extend(StatementEntries.methods, { insert, update, reconcile, autoReconciliation, remove });
_.extend(StatementEntries.methods, crudBatchOps(StatementEntries));

