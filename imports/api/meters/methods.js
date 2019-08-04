import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Meters } from './meters.js';
import { crudBatchOps } from '../batch-method.js';

export const insert = new ValidatedMethod({
  name: 'meters.insert',
  validate: Meters.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'meters.insert', doc.communityId);
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
    checkModifier(doc, modifier, ['identifier'], true);
    checkPermissions(this.userId, 'meters.update', doc.communityId);

    return Meters.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'meters.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Meters, _id);
    checkPermissions(this.userId, 'meters.remove', doc.communityId);
    Meters.remove(_id);
  },
});

Meters.methods = Meters.methods || {};
_.extend(Meters.methods, { insert, update, remove });
_.extend(Meters.methods, crudBatchOps(Meters));
