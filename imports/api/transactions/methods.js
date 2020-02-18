import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { crudBatchOps, BatchMethod } from '/imports/api/batch-method.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';
import { sendBillEmail } from '/imports/email/bill-send.js';
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

function checkBillIsPosted(billId) {
  if (!billId) throw new Meteor.Error('Bill has to exist first');
  const bill = checkExists(Transactions, billId);
  if (!bill.isPosted()) throw new Meteor.Error('Bill has to be posted first');
}

export const post = new ValidatedMethod({
  name: 'transactions.post',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.post', doc);
    let result;
    if (!doc.isPosted()) { // throw new Meteor.Error('Transaction already posted');
      if (doc.category === 'bill' || doc.category === 'receipt') {
        if (!doc.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
      } else if (doc.category === 'payment' || doc.category === 'remission') {
        doc.bills.forEach(bp => checkBillIsPosted(bp.id));
      } else if (doc.category === 'barter') {
        checkBillIsPosted(doc.supplierBillId);
        checkBillIsPosted(doc.customerBillId);
      }

      const community = Communities.findOne(doc.communityId);
      const accountingMethod = community.settings.accountingMethod;
      const updateData = doc.makeJournalEntries(accountingMethod);
      result = Transactions.update(_id, { $set: { postedAt: new Date(), ...updateData } });
    } else console.warn('Transaction already posted');

    if (Meteor.isServer && doc.category === 'bill') sendBillEmail(doc);

    return result;
  },
});

export const insert = new ValidatedMethod({
  name: 'transactions.insert',
  validate: doc => Transactions.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    doc = Transactions._transform(doc);
    checkPermissions(this.userId, 'transactions.insert', doc);
    if (doc.category === 'payment' || doc.category === 'remission') {
      doc.bills.forEach((bp, i) => {
        const bill = Transactions.findOne(bp.id);
//      if (!doc.relation || !doc.partnerId) throw new Meteor.Error('Payment relation fields are required');
        if (!bill.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
        function setOrCheckEquals(field) {
          if (i === 0) doc[field] = bill[field];
          else if (doc[field] !== bill[field]) throw new Meteor.Error(`All paid bills need to have same ${field}`, `${doc[field]} !== ${bill[field]}`);
        }
        setOrCheckEquals('relation');
        setOrCheckEquals('partnerId');
        setOrCheckEquals('membershipId');
        setOrCheckEquals('contractId');
      });
    } else if (doc.category === 'barter') {
      const supplierBill = doc.supplierBill();
      const customerBill = doc.customerBill();
      if (!supplierBill.hasConteerData() || !customerBill.hasConteerData()) throw new Meteor.Error('Bartered bill has to be conteered first');
      if (supplierBill.relation !== 'supplier') throw new Meteor.Error('Supplier bill is not from a supplier');
      if (customerBill.relation !== 'customer' && customerBill.relation !== 'member') throw new Meteor.Error('Customer bill is not from a customer/owner');
    }

    const _id = Transactions.insert(doc);
    if (doc.txdef().isAutoPosting()) post._execute({ userId: this.userId }, { _id });
//    runPositingRules(this, doc);
    return _id;
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
    checkPermissions(this.userId, 'transactions.update', doc);
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

export const remove = new ValidatedMethod({
  name: 'transactions.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.remove', doc);
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
    checkPermissions(this.userId, 'accounts.insert', { communityId });
    Templates.clone('Condominium_COA', communityId);
    Templates.clone('Condominium_Txdefs', communityId);
    Templates.clone('Condominium_PhysicalRoot', communityId);
  },
});

Transactions.methods = Transactions.methods || {};
_.extend(Transactions.methods, { insert, update, post, remove, cloneAccountingTemplates });
_.extend(Transactions.methods, crudBatchOps(Transactions));
Transactions.methods.batch.post = new BatchMethod(Transactions.methods.post);
