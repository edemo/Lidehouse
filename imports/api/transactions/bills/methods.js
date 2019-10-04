import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { extractFieldsFromRef } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Bills, PaymentSchema } from './bills.js';
import { crudBatchOps } from '../../batch-method.js';
import { Transactions } from '../transactions.js';
/*
function createAndBindTx(billId) {
  const bill = Bills.findOne(billId);
  if (!bill.account) return;
  const txId = Transactions.insert(bill.makeTx());
  Bills.update(bill._id, { $set: { txId } });
}
*/
export const insert = new ValidatedMethod({
  name: 'bills.insert',
  validate: Bills.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Bills._transform(doc);
    checkPermissions(this.userId, 'bills.insert', doc.communityId);
    const _id = Bills.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'bills.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Bills, _id);
//    checkModifier(doc, modifier, Bills.modifiableFields);
    checkPermissions(this.userId, 'bills.update', doc.communityId);
    if (doc.txId) throw new Meteor.Error('Cannot modify bill, already in accounting');

    const result = Bills.update({ _id }, modifier);
    /*
    const newDoc = Bills.findOne(_id);
    const community = Communities.findOne(doc.communityId);
    if (community.settings.accountingMethod === 'accrual') {
      const tx = Transactions.findOne({ billId: _id });
      if (tx) Transactions.update(tx._id, { $set: newDoc.makeTx() });
      else Transactions.insert(newDoc.makeTx());
    }
    */
    return result;
  },
});

export const conteer = new ValidatedMethod({
  name: 'bills.conteer',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
//    paymentId: { type: Number, decimal: true, regEx: SimpleSchema.RegEx.Id },
//    txLeg: { type: Object, blackbox: true },
  }).validator(),

  run({ _id /*, paymentId, txLeg*/ }) {
    const doc = checkExists(Bills, _id);
    checkPermissions(this.userId, 'bills.conteer', doc.communityId);
    if (!doc.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
    let result;

    const community = Communities.findOne(doc.communityId);
    const accountingMethod = community.settings.accountingMethod;
    if (accountingMethod === 'accrual') {
      if (doc.txId) throw new Meteor.Error('Bill already conteered');
      const txId = Transactions.insert(doc.makeTx());
      result = Bills.update(_id, { $set: { txId } });
    }

/*
    const existingTxId = (paymentId && doc.payments[paymentId].txId) || doc.txId;
    if (existingTxId) {
      // Transactions.remove(doc.existingTxId);
      throw new Meteor.Error('Bill already conteered');
    }

    const modifier = { $set: {} };
    if (paymentId) {
      modifier.$set[`payments.${paymentId}.txId`] = txId;
      modifier.$set[`payments.${paymentId}.txLegId`] = txLegId;
    } else {
      modifier.$set['txId'] = txId;
      modifier.$set['txLegId'] = txLegId;
    }
    const result = Bills.update({ _id }, modifier);
    createAndBindTx(_id);

    const bill = Bills.findOne(_id);*/
    doc.getPayments().forEach((payment, i) => {
      if (!payment.txId) {
        const txId = Transactions.insert(doc.makePaymentTx(payment, i, accountingMethod));
        result = Bills.update(_id, { $set: { [`lines.${i}.txId`]: txId } });
//        const tx = Transactions.findOne(payment.txId);
//        const side = bill.otherTxSide();
//        const txSide = tx.getSide(side);
//        txSide[payment.txLegId].account = bill.account;
//        txSide[payment.txLegId].localizer = bill.localizer;
//        Transactions.update(payment.txId, { $set: { [txSide]: txSide } });
      }
    });
    return result;
  },
});

export const registerPayment = new ValidatedMethod({
  name: 'bills.registerPayment',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    payment: { type: Bills.paymentSchema },
//    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, payment }) {
    const doc = checkExists(Bills, _id);
//    checkModifier(doc, modifier, ['payments']);
    checkPermissions(this.userId, 'bills.payment', doc.communityId);
    if (!doc.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
//    const result = Bills.update({ _id }, modifier);
    const paymentIndex = doc.payments.length;
    const result = Bills.update(_id, { $push: { payments: payment } });

    // Hack to force update outstanding value
    const newDoc = Bills.findOne(_id);
    Bills.update(_id, { $set: { amount: newDoc.amount, payments: newDoc.payment } });

    const community = Communities.findOne(doc.communityId);
    const txId = Transactions.insert(doc.makePaymentTx(payment, paymentIndex, community.settings.accountingMethod));
    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'bills.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Bills, _id);
    checkPermissions(this.userId, 'bills.remove', doc.communityId);
    
    return Bills.remove(_id);
  },
});

Bills.methods = Bills.methods || {};
_.extend(Bills.methods, { insert, update, conteer, registerPayment, remove });
_.extend(Bills.methods, crudBatchOps(Bills));
