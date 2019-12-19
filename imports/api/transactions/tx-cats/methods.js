import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'txCats.insert',
  validate: TxCats.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(TxCats, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'breakdowns.insert', doc);

    return TxCats.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'txCats.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(TxCats, _id);
    // checkModifier(doc, modifier, ['name'], true); - can you change the name? it is referenced by that by other breakdowns
    checkNotExists(TxCats, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkPermissions(this.userId, 'breakdowns.update', doc);

    TxCats.update({ _id }, modifier);
  },
});

export const clone = new ValidatedMethod({
  name: 'txCats.clone',
  validate: new SimpleSchema({
    name: { type: String },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ name, communityId }) {
    const doc = checkExists(TxCats, { communityId: null, name });
    checkNotExists(TxCats, { communityId, name });
    checkPermissions(this.userId, 'breakdowns.update', { communityId });

    return TxCats.clone(name, communityId);
  },
});

export const remove = new ValidatedMethod({
  name: 'txCats.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(TxCats, _id);
    checkPermissions(this.userId, 'breakdowns.remove', doc);

    TxCats.remove(_id);
  },
});

TxCats.methods = TxCats.methods || {};
_.extend(TxCats.methods, { insert, update, clone, remove });
