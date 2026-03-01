import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { checkExists, checkNotExists, checkUnique, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { MeterReadings } from './meter-readings.js';

export const insert = new ValidatedMethod({
  name: 'meterReadings.insert',
  validate: MeterReadings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'meterReadings.insert', doc);
    productionAssert(doc.type === 'reading', 'Estimates cannot be created manually');
    return MeterReadings.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'meterReadings.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(MeterReadings, _id);
//    checkModifier(doc, modifier, ['_lastReading', '_lastBilling'], true);
    checkPermissions(this.userId, 'meterReadings.update', doc);
    productionAssert(doc.type === 'reading', 'Estimates cannot be created manually');
    return MeterReadings.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'meterReadings.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(MeterReadings, _id);
    checkPermissions(this.userId, 'meterReadings.remove', doc);
    productionAssert(doc.type === 'reading', 'Estimates cannot be created manually');
    return MeterReadings.remove(_id);
  },
});

MeterReadings.methods = MeterReadings.methods || {};
_.extend(MeterReadings.methods, { insert, update, remove });
_.extend(MeterReadings.methods, crudBatchOps(MeterReadings));
