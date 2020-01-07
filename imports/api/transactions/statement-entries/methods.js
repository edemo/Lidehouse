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
    case ('parcel'): return +1;
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
  if (!namesMatch(entry, transaction.partner().getName())) throwMatchError('partnerName');
  if (transaction.valueDate.getTime() !== entry.valueDate.getTime()) throwMatchError('valueDate');
}

export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: StatementEntries.reconcileSchema.validator(),
  run({ _id, txId }) {
    const entry = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (!txId) { // not present means auto match requested
      const partner = Partners.findByName(entry.communityId, entry.partner);
      if (!partner) return;
      const matchingBill = Transactions.findOne({ category: 'bill', partnerId: partner._id, outstanding: moneyFlowSign(partner.getRelation()) * entry.amount });
      if (!matchingBill) return;
      const matchingPayment = matchingBill.getPayments().find(payment => !payment.reconciledId && payment.amount === matchingBill.outstanding);
      if (matchingPayment) {
        txId = matchingPayment._id;
      } else {
        const tx = {
          communityId: entry.communityId,
          category: 'payment',
          defId: Txdefs.findOne({ communityId: entry.communityId, category: 'payment', 'data.relation': matchingBill.relation })._id,
          valueDate: entry.valueDate,
          amount: matchingBill.outstanding,
          billId: matchingBill._id,
          relation: matchingBill.relation,
          partnerId: matchingBill.partnerId,
        };
        txId = Transactions.methods.insert._execute({ userId: this.userId }, tx);
      }
    }
    const reconciledTx = Transactions.findOne(txId);
    checkMatch(entry, reconciledTx);
    Transactions.update(reconciledTx._id, { $set: { reconciledId: _id } });
    StatementEntries.update(entry._id, { $set: { reconciledId: txId } });
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
    Transactions.update(reconciledTx._id, { $set: { reconciledId: _id } });
    const result = StatementEntries.update(_id, { $set: { reconciledId: reconciledTx._id } });
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

