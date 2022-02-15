import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import rusdiff from 'rus-diff';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { crudBatchOps, BatchMethod } from '/imports/api/batch-method.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Clock } from '/imports/utils/clock.js';
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
    doc.validateForPost?.();

    const modifier = { $set: { postedAt: new Date() } };
    if (doc.postedAt) modifier.$set.postedAt = doc.postedAt;
    if (doc.status !== 'void') { // voided already has the accounting data on it
      const community = Communities.findOne(doc.communityId);
      const accountingMethod = community.settings.accountingMethod;
      const updateData = _.extend({},
        doc.makeJournalEntries(accountingMethod),
        doc.makePartnerEntries(),
      );
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
      if (doc.relation === 'member') sendBillEmail(doc);
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
    if (Meteor.isServer && doc.category === 'bill' && doc.relation === 'member') {
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
    if (doc.category === 'payment') {
      if (!doc.contractId && doc.bills?.length) { // Only happens in tests, the UI enforces contractId input
        const bill = Transactions.findOne(doc.bills[0].id);
        doc.contractId = bill.contractId;
      }
    }
    doc.getLines?.()?.forEach((line) => {
      const parcel = Localizer.parcelFromCode(line.localizer, communityId);
      if (!line.parcelId && parcel) line.parcelId = parcel._id;
    });
    doc.validate?.();

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
    if (doc.isPosted() && doc.isPetrified()) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to modify transaction after posting', { _id, modifier });
    }
    let newDoc = rusdiff.clone(doc);
    rusdiff.apply(newDoc, modifier);
    newDoc = Transactions._transform(newDoc);
    newDoc.validate?.();
    modifier.$set?.lines?.forEach((line, i) => {
      if (line.localizer) {
        const parcel = Localizer.parcelFromCode(line.localizer, doc.communityId);
        line.parcelId = parcel?._id;
      }
    });

    const result = Transactions.update({ _id }, modifier, { selector: doc });
    if (doc.isPosted()) { // If doc was posted already, resposting is needed, because the accounting might have changed
      post._execute({ userId: this.userId }, { _id });
    }

    return result;
  },
});

export const reallocate = new ValidatedMethod({ // This methods reposts the transaction with a new allocation -- If that should be disallowed, remove this method.
  name: 'transactions.reallocate',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),
  run({ _id, modifier }) {
    const doc = checkExists(Transactions, _id);
    debugAssert(doc.category === 'payment', 'Method reallocate is only available on payments');
    checkPermissions(this.userId, 'transactions.update', doc);
    if (!doc.isPosted()) {
      throw new Meteor.Error('err_permissionDenied', 'Reallocation only available after posting', { _id, modifier });
    }
    checkModifier(doc, modifier, ['bills', 'lines']);

    let newDoc = rusdiff.clone(doc);
    rusdiff.apply(newDoc, modifier);
    newDoc = Transactions._transform(newDoc);
    newDoc.validate?.();
    newDoc.validateForPost?.();
    modifier.$set?.lines?.forEach((line, i) => {
      if (line.localizer) {
        const parcel = Localizer.parcelFromCode(line.localizer, doc.communityId);
        line.parcelId = parcel?._id;
      }
    });

    const result = Transactions.update({ _id }, modifier, { selector: doc });
    post._execute({ userId: this.userId }, { _id });
    return result;
  },
});

export const allocate = new ValidatedMethod({
  name: 'transactions.allocate',
  validate: doc => Transactions.simpleSchema(doc).validator({ clean: true })(doc),
  run(doc) {
    const payment = checkExists(Transactions, doc.paymentId);
    if (!payment.isPosted()) {
      throw new Meteor.Error('err_permissionDenied', 'Allocation only available after posting');
    }
    doc = Transactions._transform(doc);
    const communityId = doc.communityId;
    checkPermissions(this.userId, 'transactions.update', doc);

    doc.getLines?.()?.forEach((line) => {
      const parcel = Localizer.parcelFromCode(line.localizer, communityId);
      if (!line.parcelId && parcel) line.parcelId = parcel._id;
    });
    doc.validate?.();
    const _id = Transactions.insert(doc);
    Transactions.update(payment._id, { $push: { allocations: _id } }, { selector: { category: 'payment' } });  
    /* if (doc.isAutoPosting()) */ post._execute({ userId: this.userId }, { _id });
    return _id;
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
    if (doc.category === 'bill' && doc.hasPayments()) {
      throw new Meteor.Error('err_unableToRemove', 'Not possible to remove bill, while it has payments, remove the payments first');
    }
    if (doc.status === 'draft') {
      Transactions.remove(_id);
      if (doc.category === 'allocation') Transactions.update({ _id: doc.paymentId }, { $pull: { allocations: _id } }, { selector: { category: 'payment' } });
      if (doc.allocations?.length) {
        doc.allocations.forEach((allocationId) => {
          if (allocationId) Transactions.remove({ _id: allocationId });
        });
      }
      result = null;
    } else if (doc.status === 'posted') {
      // This block should happen all or none
      result = Transactions.insert(_.extend(doc.negator(), { issueDate: Clock.currentDate(), status: 'void', seId: [] }));
      Transactions.update(doc._id, { $set: { status: 'void', seId: [] } });
      const resultTx = Transactions.findOne(result);
      if (resultTx.isAutoPosting()) post._execute({ userId: this.userId }, { _id: result });
      if (doc.category === 'allocation') Transactions.update({ _id: doc.paymentId }, { $push: { allocations: result } }, { selector: { category: 'payment' } });
      if (doc.allocations?.length) {
        doc.allocations.forEach((allocationId) => {
          if (allocationId) Transactions.methods.remove({ _id: allocationId });
        });
      }
      //
    } else if (doc.status === 'void') {
      throw new Meteor.Error('err_permissionDenied', 'Not possible to remove voided transaction');
    } else debugAssert(false, `No such tx status: ${doc.status}`);

    StatementEntries.update({ txId: _id }, { $pull: { txId: _id } }, { multi: true });
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

export const statistics = new ValidatedMethod({
  name: 'transactions.statistics',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ communityId }) {
    if (Meteor.isClient) return null;
    const txStat = {};
    const transactions = Transactions.find({ communityId }).fetch();
    txStat.count = transactions.length;
    txStat.statusdata = [];
    Transactions.statusValues.forEach((status) => {
      const name = status;
      const count = transactions.filter(tx => tx.status === status).length;
      txStat.statusdata.push({ name, count });
    });
    const postedTxs = transactions.filter(tx => tx.status !== 'draft');
    txStat.misPosted = [];
    postedTxs.forEach((tx) => {
      let credit = 0;
      let debit = 0;
      tx.credit?.forEach((cr) => { credit += cr.amount; });
      tx.debit?.forEach((deb) => { debit += deb.amount; });
      if (credit !== debit) txStat.misPosted.push(tx.serialId || tx._id);
    });
    return txStat;
  },
});

Transactions.methods = Transactions.methods || {};
_.extend(Transactions.methods, { insert, update, post, reallocate, allocate, resend, remove, cloneAccountingTemplates });
_.extend(Transactions.methods, crudBatchOps(Transactions));
Transactions.methods.batch.post = new BatchMethod(Transactions.methods.post);
