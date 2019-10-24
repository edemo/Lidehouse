import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { extractFieldsFromRef } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Bills } from './bills.js';
import { Payments } from '../payments/payments.js';
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
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Bills, _id);
    checkPermissions(this.userId, 'bills.conteer', doc.communityId);
    if (!doc.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');

    const community = Communities.findOne(doc.communityId);
    const accountingMethod = community.settings.accountingMethod;
    if (doc.txId) throw new Meteor.Error('Bill already conteered');
    const txId = Transactions.insert(doc.makeTx(accountingMethod));
    return Bills.update(_id, { $set: { txId } });
/*
    doc.getPayments().forEach((payment) => {
      if (!payment.txId) {
        const txId = Transactions.insert(payment.makeTx(accountingMethod));
        result = Bills.update(_id, { $set: { [`lines.${i}.txId`]: txId } });
      }
    });
    */
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
_.extend(Bills.methods, { insert, update, conteer, remove });
_.extend(Bills.methods, crudBatchOps(Bills));
