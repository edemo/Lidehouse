import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';

import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { sanityCheckOnlyOneActiveAtAllTimes } from '/imports/api/behaviours/active-period.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Leaderships } from './leaderships';

export const insert = new ValidatedMethod({
  name: 'leaderships.insert',
  validate: Leaderships.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'leaderships.insert', doc.communityId);

    const _id = Leaderships.insert(doc);
    try {
      sanityCheckOnlyOneActiveAtAllTimes(Leaderships, { parcelId: doc.parcelId });
    } catch (err) {
      Leaderships.remove(_id);
      throw err;
    }
    return _id;
  },
});

export const update = new ValidatedMethod({
  name: 'leaderships.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Leaderships, _id);
    checkModifier(doc, modifier, ['communityId'], true);
    // Try the operation, and if it produces an insane state, revert it
    const result = Leaderships.update({ _id }, modifier);
    try {
      const newDoc = Leaderships.findOne(_id);
      sanityCheckOnlyOneActiveAtAllTimes(Leaderships, { parcelId: newDoc.parcelId });
    } catch (err) {
      Mongo.Collection.stripAdministrativeFields(doc);
      Leaderships.update({ _id }, { $set: doc });
      throw err;
    }
    return result;
  },
});

export const remove = new ValidatedMethod({
  name: 'leaderships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Leaderships, _id);
    checkPermissions(this.userId, 'leaderships.remove', doc.communityId);
    Leaderships.remove(_id);
  },
});

Leaderships.methods = Leaderships.methods || {};
_.extend(Leaderships.methods, { insert, update, remove });
_.extend(Leaderships.methods, crudBatchOps(Leaderships));
