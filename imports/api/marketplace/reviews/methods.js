import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Reviews } from './reviews.js';

export const insert = new ValidatedMethod({
  name: 'reviews.insert',
  validate: Reviews.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'reviews.insert', doc);
    return Reviews.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'reviews.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Reviews, _id);
//    checkModifier(doc, modifier, ['xxx'], true);
    checkPermissions(this.userId, 'reviews.update', doc);
    Reviews.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'reviews.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Reviews, _id);
    checkPermissions(this.userId, 'reviews.remove', doc);
    Reviews.remove(_id);
  },
});

Reviews.methods = Reviews.methods || {};
_.extend(Reviews.methods, { insert, update, remove });
_.extend(Reviews.methods, crudBatchOps(Reviews));
