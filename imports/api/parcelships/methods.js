import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { sanityCheckOnlyOneActiveAtAllTimes } from '/imports/api/behaviours/active-period.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Parcelships } from './parcelships';

export const insert = new ValidatedMethod({
  name: 'parcelships.insert',
  validate: Parcelships.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'parcelships.insert', doc);

    const ParcelshipsStage = Parcelships.Stage();
    const _id = ParcelshipsStage.insert(doc);
    sanityCheckOnlyOneActiveAtAllTimes(ParcelshipsStage, { parcelId: doc.parcelId });
    ParcelshipsStage.commit();

    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'parcelships.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Parcelships, _id);
    checkModifier(doc, modifier, ['communityId'], true);

    const ParcelshipsStage = Parcelships.Stage();
    const result = ParcelshipsStage.update(_id, modifier);
    const newDoc = ParcelshipsStage.findOne(_id);
    sanityCheckOnlyOneActiveAtAllTimes(ParcelshipsStage, { parcelId: newDoc.parcelId });
    ParcelshipsStage.commit();

    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'parcelships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Parcelships, _id);
    checkPermissions(this.userId, 'parcelships.remove', doc);
    Parcelships.remove(_id);
  },
});

Parcelships.methods = Parcelships.methods || {};
_.extend(Parcelships.methods, { insert, update, remove });
_.extend(Parcelships.methods, crudBatchOps(Parcelships));
