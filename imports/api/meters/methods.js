import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkUnique, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { sanityCheckOnlyOneActiveAtAllTimes } from '/imports/api/behaviours/active-period.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Meters } from './meters.js';

export const insert = new ValidatedMethod({
  name: 'meters.insert',
  validate: Meters.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissionsWithApprove(this.userId, 'meters.insert', doc);
    checkUnique(Meters, doc, ['communityId', 'identifier', 'service']);

//    const MetersStage = Meters.Stage();
//    const _id = MetersStage.insert(doc);
//    sanityCheckOnlyOneActiveAtAllTimes(MetersStage, { parcelId: doc.parcelId, service: doc.service });
//    MetersStage.commit();
//    return _id;
    return Meters.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'meters.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Meters, _id);
    checkModifier(doc, modifier, ['billings'], true);
    checkPermissions(this.userId, 'meters.update', doc);

//    const MetersStage = Meters.Stage();
//    const result = MetersStage.update(_id, modifier);
//    const newDoc = MetersStage.findOne(_id);
//    sanityCheckOnlyOneActiveAtAllTimes(MetersStage, { parcelId: newDoc.parcelId, service: newDoc.service });
//    MetersStage.commit();
//    return result;
    Meters.update(_id, modifier);
  },
});

export const updateReadings = new ValidatedMethod({
  name: 'meters.updateReadings',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Meters, _id);
    checkModifier(doc, modifier, ['readings']);
    checkPermissions(this.userId, 'meters.update', doc);

    return Meters.update(_id, modifier);
  },
});

export const registerReading = new ValidatedMethod({
  name: 'meters.registerReading',
  validate: Meters.registerReadingSchema.validator(),

  run({ _id, reading }) {
    const doc = checkExists(Meters, _id);
    const user = checkPermissions(this.userId, 'meters.registerReading', doc);

    const lastReading = doc.lastReading();
    if (lastReading && reading.date < lastReading.date) {
      throw new Meteor.Error('err_notAllowed', 'There is already a newer reading');
    }
    if (lastReading && reading.value < lastReading.value) {
      throw new Meteor.Error('err_notAllowed', 'There is already a higher reading');
    }

    _.extend(reading, { approved: user.hasPermission('meters.update', doc) });
    const modifier = { $push: { readings: reading } };

    return Meters.update(_id, modifier);
  },
});
/*
export const estimateReading = new ValidatedMethod({
  name: 'meters.estimate',
  validate: Meters.registerReadingSchema.validator(),

  run({ _id }) {
    const doc = checkExists(Meters, _id);
    checkPermissions(this.userId, 'meters.reading', doc);

    const estimate = doc.getEstimate();
    _.extend(estimate, { approved: false });
    const modifier = { $push: { readings: estimate } };

    return Meters.update(_id, modifier);
  },
});
*/

export const registerBilling = new ValidatedMethod({
  name: 'meters.registerBilling',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    billing: { type: Meters.billingSchema },
  }).validator(),

  run({ _id, billing }) {
    const doc = checkExists(Meters, _id);
    checkPermissions(this.userId, 'parcelBillings.apply', doc);
    const modifier = { $push: { billings: billing } };

    return Meters.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'meters.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Meters, _id);
    checkPermissions(this.userId, 'meters.remove', doc);
    if (doc.unbilledReadAmount()) { // cannot be positive or negative either
      throw new Meteor.Error('err_unableToRemove', 'Meter cannot be deleted while it has unbilled amount',
       `Unbilled amount: {${doc.unbilledReadAmount()}}`);
    }
    Meters.remove(_id);
  },
});

Meters.methods = Meters.methods || {};
_.extend(Meters.methods, { insert, update, remove, registerReading, registerBilling });
_.extend(Meters.methods, crudBatchOps(Meters));
