import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'txdefs.insert',
  validate: Txdefs.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Txdefs, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'accounts.insert', doc);

    return Txdefs.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txdefs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Txdefs, _id);
    // checkModifier(doc, modifier, ['name'], true); - can you change the name? it is referenced by that by other accounts
    checkNotExists(Txdefs, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkPermissions(this.userId, 'accounts.update', doc);

    Txdefs.update({ _id }, modifier);
  },
});

export const clone = new ValidatedMethod({
  name: 'txdefs.clone',
  validate: new SimpleSchema({
    name: { type: String },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ name, communityId }) {
    const doc = checkExists(Txdefs, { communityId: null, name });
    checkNotExists(Txdefs, { communityId, name });
    checkPermissions(this.userId, 'accounts.update', { communityId });

    return Txdefs.clone(name, communityId);
  },
});

export const remove = new ValidatedMethod({
  name: 'txdefs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Txdefs, _id);
    checkPermissions(this.userId, 'accounts.remove', doc);

    Txdefs.remove(_id);
  },
});

Txdefs.methods = Txdefs.methods || {};
_.extend(Txdefs.methods, { insert, update, clone, remove });
