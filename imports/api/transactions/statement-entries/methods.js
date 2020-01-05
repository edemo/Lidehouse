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
import { TxDefs } from '/imports/api/transactions/tx-defs/tx-defs.js';
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

export const match = new ValidatedMethod({
  name: 'statementEntries.match',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
    match: { type: Object, blackbox: true, optional: true },  // not present means auto match requested
  }).validator(),
  run({ _id, match }) {
    const entry = checkExists(StatementEntries, _id);
    console.log("Matching", entry);
    console.log("with", match);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (!match) {
      const partner = Partners.findByName(entry.communityId, entry.partner);
      console.log("partner:", partner);
      if (!partner) return;
      const matchingBill = Transactions.findOne({ category: 'bill', partnerId: partner._id, outstanding: moneyFlowSign(partner.getRelation()) * entry.amount });
      console.log("matchingBill:", matchingBill);
      if (!matchingBill) return;
      const matchingPayment = matchingBill.getPayments().find(payment => !payment.reconciledId && payment.amount === matchingBill.outstanding);
      console.log("matchingPayment:", matchingPayment);
      if (matchingPayment) {
        match = matchingPayment;
        console.log("match = MatchingPayment", match);
      } else {
        match = {
          communityId: entry.communityId,
          category: 'payment',
          defId: TxDefs.findOne({ communityId: entry.communityId, category: 'payment', 'data.relation': matchingBill.relation })._id,
          valueDate: entry.valueDate,
          amount: matchingBill.outstanding,
          billId: matchingBill._id,
          relation: matchingBill.relation,
          partnerId: matchingBill.partnerId,
        };
        console.log("match = NewPayment", match);
      }
    }
    const result = StatementEntries.update(entry._id, { $set: { match } });
    console.log("StatementEntry:", StatementEntries.findOne(entry._id));
    return match;
  },
});

export const matching = new ValidatedMethod({
  name: 'statementEntries.matching',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    StatementEntries.find({ communityId, match: { $exists: false } }).forEach(entry => {
      match._execute({ userId: this.userId }, { _id: entry._id });
    });
  },
});

function checkMatch(entry, transaction) {
  function throwMatcherror(mismatch) {
    console.log(JSON.stringify(entry));
    console.log(JSON.stringify(transaction));
    throw new Meteor.Error('err_notAllowed',
      `Cannot reconcile entry with transaction - mismatch: ${mismatch}`);
  }
  if (transaction.amount !== moneyFlowSign(transaction.relation) * entry.amount) throwMatcherror('amount');
  if (!namesMatch(entry, transaction.partner().getName())) throwMatcherror('partnerName');
  if (transaction.valueDate.getTime() !== entry.valueDate.getTime()) throwMatcherror('valueDate');
}

export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  }).validator(),

  run({ _id }) {
    const entry = checkExists(StatementEntries, _id);
    console.log('Reconciling:', entry);
    checkPermissions(this.userId, 'statements.reconcile', entry);
    if (!entry.match) throw new Meteor.Error('err_notExists', 'No match provided to reconcile ' + entry._id + ' with');
    console.log('ReconciledTx:', entry.match);
    const reconciledTx = entry.match._id ? Transactions.findOne(entry.match._id) : Transactions._transform(entry.match);
    checkMatch(entry, reconciledTx);
    if (!reconciledTx._id) {
      console.log('No _id so inserting:');
      reconciledTx._id = Transactions.methods.insert._execute({ userId: this.userId }, reconciledTx);
      console.log(reconciledTx._id);
      Transactions.methods.post._execute({ userId: this.userId }, { _id: reconciledTx._id });
    }
    Transactions.update(reconciledTx._id, { $set: { reconciledId: _id } });
    console.log(Transactions.findOne(reconciledTx._id));
    console.log('Setting the statemet reconciled:');
    const result = StatementEntries.update(_id, { $set: { reconciledId: reconciledTx._id } });
    console.log(StatementEntries.findOne(_id));
    return result;
  },
});

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
_.extend(StatementEntries.methods, { insert, update, match, matching, reconcile, remove });
_.extend(StatementEntries.methods, crudBatchOps(StatementEntries));

