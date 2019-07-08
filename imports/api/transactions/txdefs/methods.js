import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { TxDefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'txDefs.insert',
  validate: TxDefs.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(TxDefs, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'breakdowns.insert', doc.communityId);

    return TxDefs.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txDefs.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(TxDefs, _id);
    // checkModifier(doc, modifier, ['name'], true); - can you change the name? it is referenced by that by other breakdowns
    checkNotExists(TxDefs, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkPermissions(this.userId, 'breakdowns.update', doc.communityId);

    TxDefs.update({ _id }, modifier);
  },
});

export const clone = new ValidatedMethod({
  name: 'txDefs.clone',
  validate: new SimpleSchema({
    name: { type: String },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ name, communityId }) {
    const doc = checkExists(TxDefs, { communityId: null, name });
    checkNotExists(TxDefs, { communityId, name });
    checkPermissions(this.userId, 'breakdowns.update', communityId);

    return TxDefs.clone(name, communityId);
  },
});

export const remove = new ValidatedMethod({
  name: 'txDefs.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(TxDefs, _id);
    checkPermissions(this.userId, 'breakdowns.remove', doc.communityId);

    TxDefs.remove(_id);
  },
});

TxDefs.methods = TxDefs.methods || {};
_.extend(TxDefs.methods, { insert, update, clone, remove });
