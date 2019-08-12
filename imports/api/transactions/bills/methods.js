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

function createAndBindTx(billId) {
  const bill = Bills.findOne(billId);
  if (!bill.account) return;
  const txId = Transactions.insert(bill.makeTx());
  Bills.update(bill._id, { $set: { txId } });
}

export const insert = new ValidatedMethod({
  name: 'bills.insert',
  validate: Bills.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Bills._transform(doc);
    checkPermissions(this.userId, 'bills.insert', doc.communityId);
    const _id = Bills.insert(doc);
    createAndBindTx(_id);
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
    checkModifier(doc, modifier, Bills.modifiableFields);
    checkPermissions(this.userId, 'bills.update', doc.communityId);

    return Bills.update({ _id }, modifier);
  },
});

export const conteer = new ValidatedMethod({
  name: 'bills.conteer',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Bills, _id);
    checkModifier(doc, modifier, ['partner', 'account', 'localizer']);
    checkPermissions(this.userId, 'bills.conteer', doc.communityId);

    if (doc.txId) Transactions.remove(doc.txId);
    const result = Bills.update({ _id }, modifier);
    createAndBindTx(_id);
    return result;
  },
});

export const payment = new ValidatedMethod({
  name: 'bills.payment',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
//    payment: { type: Bills.paymentSchema },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Bills, _id);
    checkModifier(doc, modifier, ['payments']);
    checkPermissions(this.userId, 'bills.payment', doc.communityId);

    const result = Bills.update({ _id }, modifier);
//    const result = Bills.update({ _id }, { $push: { payments: payment } });
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
_.extend(Bills.methods, { insert, update, conteer, payment, remove });
_.extend(Bills.methods, crudBatchOps(Bills));
