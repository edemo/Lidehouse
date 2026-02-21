import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkUnique, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Meters } from './meters.js';
import { MeterReadings } from './meter-readings/meter-readings.js';

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
    checkModifier(doc, modifier, ['_lastReading', '_lastBilling'], true);
    checkPermissions(this.userId, 'meters.update', doc);

//    const MetersStage = Meters.Stage();
//    const result = MetersStage.update(_id, modifier);
//    const newDoc = MetersStage.findOne(_id);
//    sanityCheckOnlyOneActiveAtAllTimes(MetersStage, { parcelId: newDoc.parcelId, service: newDoc.service });
//    MetersStage.commit();
//    return result;
    return Meters.update(_id, modifier);
  },
});

export const registerReading = new ValidatedMethod({
  name: 'meters.registerReading',
  validate: MeterReadings.registerReadingSchema.validator(),

  run({ _id, reading }) {
    const meter = checkExists(Meters, _id);
    const doc = _.extend({}, reading, { 
      communityId: meter.communityId,
      meterId: meter._id,
      type: 'reading',
    });
    checkPermissionsWithApprove(this.userId, 'meters.registerReading', meter, doc);
    const lastReading = meter._lastReading;
    if (lastReading && reading.date < lastReading.date) {
      throw new Meteor.Error('err_notAllowed', 'There is already a newer reading');
    }
    if (lastReading && reading.value < lastReading.value) {
      throw new Meteor.Error('err_notAllowed', 'There is already a higher reading');
    }
    return MeterReadings.insert(doc);
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
    return Meters.remove(_id);
  },
});

Meters.methods = Meters.methods || {};
_.extend(Meters.methods, { insert, update, remove, registerReading });
_.extend(Meters.methods, crudBatchOps(Meters));
