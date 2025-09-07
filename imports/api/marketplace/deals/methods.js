import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions, checkPermissionsWithApprove } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Deals } from './deals.js';

export const insert = new ValidatedMethod({
  name: 'deals.insert',
  validate: Deals.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'deals.insert', doc);
    return Deals.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'deals.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Deals, _id);
//    checkModifier(doc, modifier, ['xxx'], true);
    checkPermissions(this.userId, 'deals.update', doc);
    Deals.update(_id, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'deals.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Deals, _id);
    checkPermissions(this.userId, 'deals.remove', doc);
    Deals.remove(_id);
  },
});

Deals.methods = Deals.methods || {};
_.extend(Deals.methods, { insert, update, remove });
_.extend(Deals.methods, crudBatchOps(Deals));
