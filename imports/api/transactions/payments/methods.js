import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { extractFieldsFromRef } from '/imports/comtypes/house/parcelref-format.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Payments } from './payments.js';
import { Bills } from '../bills/bills.js';
import { crudBatchOps, BatchMethod } from '../../batch-method.js';
import { Transactions } from '../transactions.js';


export const insert = new ValidatedMethod({
  name: 'payments.insert',
  validate: Payments.simpleSchema().validator({ clean: true }),

  run(doc) {
//    doc = Payments._transform(doc);
    checkPermissions(this.userId, 'payments.insert', doc.communityId);
    let bill;
    if (doc.billId) {
      bill = Bills.findOne(doc.billId);
      if (!bill.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');
    }

    const _id = Payments.insert(doc);
    doc = Payments.findOne(_id);

    if (doc.billId) {
      bill = Bills.findOne(doc.billId);
      Bills.update(doc.billId, { $set: { amount: bill.amount, payments: bill.payments.concat([_id]) } });
    }
    
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'payments.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Payments, _id);
//    checkModifier(doc, modifier, Payments.modifiableFields);
    checkPermissions(this.userId, 'payments.update', doc.communityId);
    if (doc.txId) throw new Meteor.Error('Cannot modify bill, already in accounting');

    const result = Payments.update({ _id }, modifier);
    return result;
  },
});

export const post = new ValidatedMethod({
  name: 'payments.post',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const payment = checkExists(Payments, _id);
    checkPermissions(this.userId, 'payments.post', payment.communityId);
    if (!payment.billId) throw new Meteor.Error('Bill has to exist first');
    const bill = checkExists(Bills, payment.billId);
    if (!bill.hasConteerData()) throw new Meteor.Error('Bill has to be conteered first');

    const community = Communities.findOne(payment.communityId);
    const accountingMethod = community.settings.accountingMethod;

    if (payment.txId) throw new Meteor.Error('Payment already conteered');
    const txId = Transactions.insert(payment.makeTx(accountingMethod));
    return Payments.update(_id, { $set: { txId } });
  },
});

export const remove = new ValidatedMethod({
  name: 'payments.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Payments, _id);
    checkPermissions(this.userId, 'payments.remove', doc.communityId);
    
    return Payments.remove(_id);
  },
});

Payments.methods = Payments.methods || {};
_.extend(Payments.methods, { insert, update, post, remove });
_.extend(Payments.methods, crudBatchOps(Payments));
Payments.methods.batch.post = new BatchMethod(Payments.methods.post);
