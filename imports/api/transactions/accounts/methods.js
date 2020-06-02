import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkPermissions, checkModifier } from '/imports/api/method-checks.js';
import { crudBatchOps } from '/imports/api/batch-method.js';
import { Accounts } from './accounts.js';

export const insert = new ValidatedMethod({
  name: 'accounts.insert',
  validate: doc => Accounts.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    checkNotExists(Accounts, { communityId: doc.communityId, code: doc.code });
    checkPermissions(this.userId, 'accounts.insert', doc);

    return Accounts.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'accounts.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Accounts, _id);
    checkModifier(doc, modifier, ['code'], true);
    checkPermissions(this.userId, 'accounts.update', doc);

    Accounts.update({ _id }, modifier, { selector: { category: doc.category } });
  },
});

export const remove = new ValidatedMethod({
  name: 'accounts.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(Accounts, _id);
    checkPermissions(this.userId, 'accounts.remove', doc);
    Accounts.remove(_id);
  },
});

Accounts.methods = Accounts.methods || {};
_.extend(Accounts.methods, { insert, update, remove });
_.extend(Accounts.methods, crudBatchOps(Accounts));
