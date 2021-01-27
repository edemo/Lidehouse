import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { crudBatchOps, BatchMethod } from '/imports/api/batch-method.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Templates } from '/imports/api/transactions/templates/templates.js';
import { sendBillEmail } from '/imports/email/bill-send.js';
import '/imports/api/transactions/txdefs/methods.js';
import { StatementEntries } from './statement-entries/statement-entries';

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
// Allowing repost action
//   if (doc.isPosted()) throw new Meteor.Error('Transaction already posted');

    if (doc.category === 'bill' || doc.category === 'receipt') {
      if (!doc.hasConteerData()) throw new Meteor.Error('Bill has to be account assigned first');
    } else if (doc.category === 'payment') {
      doc.getBills().forEach(bp => checkBillIsPosted(bp.id));
    } else if (doc.category === 'barter') {
      checkBillIsPosted(doc.supplierBillId);
      checkBillIsPosted(doc.customerBillId);
    }

    const modifier = { $set: { postedAt: new Date() } };
    if (doc.status !== 'void') { // voided already has the accounting data on it
      const community = Communities.findOne(doc.communityId);
      const accountingMethod = community.settings.accountingMethod;
      const updateData = doc.makeJournalEntries(accountingMethod);
      _.extend(modifier.$set, { status: 'posted', ...updateData });
    }
    const result = Transactions.update(_id, modifier);

    if (!doc.isPosted() && Meteor.isServer && doc.category === 'bill') {
      doc.getLines().forEach((line) => {
        if (line.metering) {
          Meters.methods.registerBilling._execute({ userId: this.userId }, { _id: line.metering.id,
            billing: { date: line.metering.end.date, value: line.metering.end.value, billId: doc._id },
          });
        }
      });
      sendBillEmail(doc);
    }

    return result;
  },
});

export const resend = new ValidatedMethod({
  name: 'transactions.resend',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.post', doc);
    if (Meteor.isServer && doc.category === 'bill') {
      sendBillEmail(doc);
    }
  },
});

export const insert = new ValidatedMethod({
  name: 'transactions.insert',
  validate: doc => Transactions.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    doc = Transactions._transform(doc);
    const communityId = doc.communityId;
    checkPermissions(this.userId, 'transactions.insert', doc);
//  if (doc.category === 'payment') {
//    doc.getBills?.()?.forEach((bp) => {
//      const bill = Transactions.findOne(bp.id);
//      if (!doc.relation || !doc.partnerId) throw new Meteor.Error('Payment relation fields are required');
//        if (!bill.hasConteerData()) throw new Meteor.Error('Bill has to be account assigned first');
//        function setOrCheckEquals(field) {
//          if (!doc[field]) doc[field] = bill[field];
//          else if (doc[field] !== bill[field]) {
//            throw new Meteor.Error(`All paid bills need to have same ${field}`, `${doc[field]} !== ${bill[field]}`);
//          }
//        }
//        setOrCheckEquals('relation');
//        setOrCheckEquals('partnerId');
//        setOrCheckEquals('contractId');
//     });
//   }
    doc.getLines?.()?.forEach((line) => {
      const parcel = Localizer.parcelFromCode(line.localizer, communityId);
      if (!line.contractId && parcel) {
        const contract = parcel?.payerContract();
        line.contractId = contract?._id;
      }
      if (!line.parcelId && parcel) line.parcelId = parcel._id;
    });
    if (doc.category === 'barter') {
      const supplierBill = doc.supplierBill();
      const customerBill = doc.customerBill();
//      if (!supplierBill.hasConteerData() || !customerBill.hasConteerData()) throw new Meteor.Error('Bill has to be account assigned first');
      if (supplierBill.relation !== 'supplier') throw new Meteor.Error('Supplier bill is not from a supplier');
      if (customerBill.relation !== 'customer' && customerBill.relation !== 'member') throw new Meteor.Error('Customer bill is not from a customer/owner');
    }

    const _id = Transactions.insert(doc);
    if (doc.isAutoPosting()) post._execute({ userId: this.userId }, { _id });
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
    if (doc.isPosted()) {
      if (doc.category === 'payment') {
        checkModifier(doc, modifier, ['bills', 'lines']);
      } else {
        throw new Meteor.Error('err_permissionDenied', 'No permission to modify transaction after posting', { _id, modifier });
      }
    }
    modifier.$set?.lines?.forEach((line, i) => {
      if (line.localizer) {
        const parcel = Localizer.parcelFromCode(line.localizer, doc.communityId);
        const contract = parcel?.payerContract();
        line.contractId = contract?._id;
        line.parcelId = parcel?._id;
      }
    });

    return Transactions.update({ _id }, modifier, { selector: doc });
  },
});

export const remove = new ValidatedMethod({
  name: 'transactions.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ _id }) {
    const doc = checkExists(Transactions, _id);
    checkPermissions(this.userId, 'transactions.remove', doc);
    let result;
    if (doc.status === 'draft') {
      Transactions.remove(_id);
      result = null;
    } else if (doc.status === 'posted') {
      Transactions.update(doc._id, { $set: { status: 'void' } });
      result = Transactions.insert(_.extend(doc.negator(), { status: 'void' }));
      const resultTx = Transactions.findOne(result);
      if (resultTx.isAutoPosting()) post._execute({ userId: this.userId }, { _id: result });
    } else if (doc.status === 'void') {
      throw new Meteor.Error('err_permissionDenied', 'Not possible to remove voided transaction');
    } else debugAssert(false, `No such tx status: ${doc.status}`);

    StatementEntries.update({ txId: _id }, { $unset: { txId: '' } }, { multi: true });
    return result;
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
    if (Meteor.isClient) return // account templates are not available on client side
    Templates.clone('Condominium_COA', communityId);
    Templates.clone('Condominium_Localizer', communityId);
    Templates.clone('Condominium_Txdefs', communityId);
  },
});

Transactions.methods = Transactions.methods || {};
_.extend(Transactions.methods, { insert, update, post, resend, remove, cloneAccountingTemplates });
_.extend(Transactions.methods, crudBatchOps(Transactions));
Transactions.methods.batch.post = new BatchMethod(Transactions.methods.post);
