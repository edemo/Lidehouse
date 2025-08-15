import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Breakdowns } from '/imports/api/accounting/breakdowns/breakdowns.js';
import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';

export const insert = new ValidatedMethod({
  name: 'breakdowns.insert',
  validate: Breakdowns.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkNotExists(Breakdowns, { communityId: doc.communityId, name: doc.name });
    checkPermissions(this.userId, 'accounts.insert', doc);

    return Breakdowns.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'breakdowns.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Breakdowns, _id);
    // checkModifier(doc, modifier, ['name'], true); - can you change the name? it is referenced by that by other breakdowns
    checkNotExists(Breakdowns, { _id: { $ne: doc._id }, communityId: doc.communityId, name: modifier.$set.name });
    checkPermissions(this.userId, 'accounts.update', doc);

    Breakdowns.update({ _id }, modifier);
  },
});

export const clone = new ValidatedMethod({
  name: 'breakdowns.clone',
  validate: new SimpleSchema({
    name: { type: String },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ name, communityId }) {
    const doc = checkExists(Breakdowns, { communityId: null, name });
//    checkNotExists(Breakdowns, { communityId, name });
    checkPermissions(this.userId, 'accounts.update', { communityId });

    return Breakdowns.clone(name, communityId);
  },
});

export const remove = new ValidatedMethod({
  name: 'breakdowns.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Breakdowns, _id);
    checkPermissions(this.userId, 'accounts.remove', doc);

    Breakdowns.remove(_id);
  },
});

Breakdowns.methods = Breakdowns.methods || {};
_.extend(Breakdowns.methods, { insert, update, clone, remove });
