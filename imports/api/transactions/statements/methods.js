import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps } from '../../batch-method.js';
import { Bills } from '../bills/bills.js';
import { Statements, StatementEntries } from './statements.js';

export const insert = new ValidatedMethod({
  name: 'statements.insert',
  validate: Statements.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = Statements._transform(doc);
    checkPermissions(this.userId, 'statements.insert', doc.communityId);
    const _id = Statements.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'statements.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Statements, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.update', doc.communityId);

    const result = Statements.update({ _id }, modifier);
    return result;
  },
});


export const remove = new ValidatedMethod({
  name: 'statements.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Statements, _id);
    checkPermissions(this.userId, 'statements.remove', doc.communityId);

    return Statements.remove(_id);
  },
});

Statements.methods = Statements.methods || {};
_.extend(Statements.methods, { insert, update, remove });
_.extend(Statements.methods, crudBatchOps(Statements));

//------------------------------------------------------

export const insertEntry = new ValidatedMethod({
  name: 'statements.insertEntry',
  validate: StatementEntries.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = StatementEntries._transform(doc);
    checkPermissions(this.userId, 'statements.insert', doc.communityId);
    const _id = StatementEntries.insert(doc);
    return _id;
  },
});

export const updateEntry = new ValidatedMethod({
  name: 'statements.updateEntry',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(StatementEntries, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.update', doc.communityId);

    const result = StatementEntries.update({ _id }, modifier);
    return result;
  },
});

export const reconcileEntry = new ValidatedMethod({
  name: 'statements.reconcileEntry',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    billId: { type: String, regEx: SimpleSchema.RegEx.Id },
    paymentId: { type: Number, optional: true },
  }).validator(),

  run({ _id, billId, paymentId }) {
    const entry = checkExists(StatementEntries, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.reconcile', entry.communityId);
    const bill = checkExists(Bills, billId);
    if (_.isUndefined(paymentId)) {
      Bills.methods.registerPayment._execute({ userId: this.userId }, { _id: billId, payment: {
        valueDate: entry.valueDate, amount: entry.amount, account: entry.account, reconciled: true,
      } });
    } else {
      Bills.update(billId, { $set: { [`bill.payments.${paymentId}.reconciled`]: true } });
    }

    const result = StatementEntries.update({ _id }, { $set: { reconciled: true } });
    return result;
  },
});

export const removeEntry = new ValidatedMethod({
  name: 'statements.removeEntry',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(StatementEntries, _id);
    checkPermissions(this.userId, 'statements.remove', doc.communityId);

    return StatementEntries.remove(_id);
  },
});

StatementEntries.methods = StatementEntries.methods || {};
_.extend(StatementEntries.methods, { insert: insertEntry, update: updateEntry, reconcile: reconcileEntry, remove: removeEntry });
_.extend(StatementEntries.methods, crudBatchOps(StatementEntries));

