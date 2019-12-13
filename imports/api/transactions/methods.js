import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { crudBatchOps, BatchMethod } from '/imports/api/batch-method.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import '/imports/api/transactions/breakdowns/methods.js';
import '/imports/api/transactions/tx-cats/methods.js';

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
  validate: doc => Transactions.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    checkPermissions(this.userId, 'transactions.insert', doc.communityId);
    if (doc.category === 'payment') {
      if (doc.billId) {
        const bill = Transactions.findOne(doc.billId);
        if (!bill.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
        doc.relation = bill.relation;
        doc.partnerId = bill.partnerId;
        doc.contractId = bill.contractId;
      }
//      if (!doc.relation || !doc.partnerId) throw new Meteor.Error('Payment relation fields are required');
    }

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
    Transactions.update({ _id }, modifier, { selector: { category: doc.category } });
  },
});

function checkMatches(tx, txLeg, bill) {
  const txAmount = txLeg.amount || tx.amount;
  if (tx.communityId !== bill.communityId || txAmount !== bill.amount) {
    throw new Meteor.Error('err_sanityCheckFailed', 'Tx does not match Bill');
  }
}

export const post = new ValidatedMethod({
  name: 'transactions.post',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.post', doc.communityId);
    if (doc.isPosted()) throw new Meteor.Error('Transaction already posted');
    if (doc.category === 'bill') {
      if (!doc.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
    } else if (doc.category === 'payment') {
      if (!doc.billId) throw new Meteor.Error('Bill has to exist first');
      const bill = checkExists(Transactions, doc.billId);
      if (!bill.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
    }

    const community = Communities.findOne(doc.communityId);
    const accountingMethod = community.settings.accountingMethod;
    const updateData = doc.post(accountingMethod);
    return Transactions.update(_id, { $set: { postedAt: new Date(), ...updateData } });
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
    const txCatsToClone = TxCats.find({ communityId: null }).map(td => td.name);  // TODO select whats needed
    txCatsToClone.forEach((txCatName) => {
      TxCats.methods.clone._execute(
        { userId: this.userId },
        { name: txCatName, communityId },
      );
    });
    Localizer.generateParcels(communityId, user.settings.language);
  },
});

Transactions.methods = Transactions.methods || {};
_.extend(Transactions.methods, { insert, update, post, remove, cloneAccountingTemplates });
_.extend(Transactions.methods, crudBatchOps(Transactions));
Transactions.methods.batch.post = new BatchMethod(Transactions.methods.post);
