import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { crudBatchOps } from '/imports/api/batch-method.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import '/imports/api/transactions/breakdowns/methods.js';
import '/imports/api/transactions/txdefs/methods.js';

/*
function runPositingRules(context, doc) {
  const isSubAccountOf = Breakdowns.isSubAccountOf.bind({ communityId: doc.communityId });
  if (doc.credit[0].account['Incomes'] && isSubAccountOf(doc.credit[0].account['Incomes'], 'Owner payins', 'Incomes')
    && doc.debit[0].account['Assets'] && isSubAccountOf(doc.debit[0].account['Assets'], 'Money accounts', 'Assets')) {
    const newDoc = _.clone(doc);
    newDoc.credit = [{
      account: {
        'Assets': doc.credit[0].account['Incomes'],  // Obligation decreases
        'Localizer': doc.credit[0].account['Localizer'],
      },
    }];
    newDoc.debit = [{
      account: {
        'Liabilities': doc.credit[0].account['Incomes'],
        'Localizer': doc.credit[0].account['Localizer'],
      },
    }];
    newDoc.sourceId = doc._id;
    Transactions.insert(newDoc);
  }
}
*/

export const insert = new ValidatedMethod({
  name: 'transactions.insert',
  validate: Transactions.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'transactions.insert', doc.communityId);
    const id = Transactions.insert(doc);
//    runPositingRules(this, doc);
    return id;
  },
});

export const update = new ValidatedMethod({
  name: 'transactions.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Transactions, _id);
    checkModifier(doc, modifier, ['communityId'], true);
    checkPermissions(this.userId, 'transactions.update', doc.communityId);
    if (doc.isSolidified() && doc.complete) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to modify transaction after 24 hours');
    }
    Transactions.update({ _id }, modifier);
  },
});

function checkMatches(tx, bill) {
  if (tx.communityId !== bill.communityId || tx.amount > bill.amount) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Tx does not match Bill');
  }
}

export const reconcile = new ValidatedMethod({
  name: 'transactions.reconcile',
  validate: new SimpleSchema({
    txId: { type: String, regEx: SimpleSchema.RegEx.Id },
    billId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ txId, billId }) {
    const tx = checkExists(Transactions, txId);
    const bill = checkExists(Bills, billId);
    checkMatches(tx, bill);
    checkPermissions(this.userId, 'transactions.reconcile', tx.communityId);
    const paymentId = bill.paymentCount();
    const payment = {
      amount: tx.amount,
      valueDate: tx.valueDate,
      txId: tx._id,
//      paymentId,
    };
    Bills.update(billId, { $push: { payments: payment } });
    Transactions.update(txId, { $set: { 'debit.0.billId': billId, 'debit.0.paymentId': paymentId, reconciled: true } });
    console.log('RECONCILED', Transactions.findOne(txId));
    return true;
  },
});

export const remove = new ValidatedMethod({
  name: 'transactions.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.remove', doc.communityId);
    if (doc.isSolidified() && doc.complete) {
      // Not possible to delete tx after 24 hours, but possible to negate it with another tx
      Transactions.insert(doc.negator());
    } else {
      Transactions.remove(_id);
    }
  },
});

export const cloneAccountingTemplates = new ValidatedMethod({
  name: 'transactions.cloneAccountingTemplates',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
//    name: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId /*, name*/ }) {
    checkPermissions(this.userId, 'breakdowns.insert', communityId);
    const user = Meteor.users.findOne(this.userId);
    const breakdownsToClone = Breakdowns.find({ communityId: null }).map(brd => brd.name);
    breakdownsToClone.forEach((breakdownName) => {
      Breakdowns.methods.clone._execute(
        { userId: this.userId },
        { name: breakdownName, communityId },
      );
    });
    const txDefsToClone = TxDefs.find({ communityId: null }).map(td => td.name);  // TODO select whats needed
    txDefsToClone.forEach((txDefName) => {
      TxDefs.methods.clone._execute(
        { userId: this.userId },
        { name: txDefName, communityId },
      );
    });
    Localizer.generateParcels(communityId, user.settings.language);
  },
});

Transactions.methods = Transactions.methods || {};
_.extend(Transactions.methods, { insert, update, reconcile, remove, cloneAccountingTemplates });
_.extend(Transactions.methods, crudBatchOps(Transactions));
