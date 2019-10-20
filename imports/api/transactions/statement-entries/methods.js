import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { crudBatchOps } from '../../batch-method.js';
import { Bills } from '../bills/bills.js';
import { Payments } from '../payments/payments.js';
import { StatementEntries } from './statement-entries.js';

export const insert = new ValidatedMethod({
  name: 'statementEntries.insert',
  validate: StatementEntries.simpleSchema().validator({ clean: true }),

  run(doc) {
    doc = StatementEntries._transform(doc);
    checkPermissions(this.userId, 'statements.insert', doc.communityId);
    const _id = StatementEntries.insert(doc);
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'statementEntries.update',
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

export const reconcile = new ValidatedMethod({
  name: 'statementEntries.reconcile',
  validate: StatementEntries.reconcileSchema.validator(),

  run({ _id, billId, paymentId }) {
    const entry = checkExists(StatementEntries, _id);
//    checkModifier(doc, modifier, Statements.modifiableFields);
    checkPermissions(this.userId, 'statements.reconcile', entry.communityId);
    if (_.isUndefined(paymentId)) {
      if (!billId) throw new Meteor.Error('Need to select either a payment or a bill');
      paymentId = Payments.methods.insert._execute({ userId: this.userId }, {
        communityId: entry.communityId, billId,
        valueDate: entry.valueDate, amount: entry.amount, account: entry.account,
      });
    }
    Payments.update(paymentId, { $set: { reconciledId: _id } });

    const result = StatementEntries.update(_id, { $set: { reconciledId: paymentId } });
    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'statementEntries.remove',
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
_.extend(StatementEntries.methods, { insert, update, reconcile, remove });
_.extend(StatementEntries.methods, crudBatchOps(StatementEntries));

