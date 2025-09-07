import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { sanityCheckOnlyOneActiveAtAllTimes } from '/imports/api/behaviours/active-period.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Listings } from './listings.js';

export const insert = new ValidatedMethod({
  name: 'listings.insert',
  validate: Listings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'listings.insert', doc);
    return Listings.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'listings.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Listings, _id);
//    checkModifier(doc, modifier, ['xxx'], true);
    checkPermissions(this.userId, 'listings.update', doc);
    Listings.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'listings.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Listings, _id);
    checkPermissions(this.userId, 'listings.remove', doc);
    Listings.remove(_id);
  },
});

Listings.methods = Listings.methods || {};
_.extend(Listings.methods, { insert, update, remove });
_.extend(Listings.methods, crudBatchOps(Listings));
