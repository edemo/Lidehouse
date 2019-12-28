import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkLoggedIn, checkExists, checkNotExists, checkPermissions, checkModifier } from '../method-checks.js';
import { MoneyAccounts } from './money-accounts.js';

export const insert = new ValidatedMethod({
  name: 'moneyAccounts.insert',
  validate: doc => MoneyAccounts.simpleSchema(doc).validator({ clean: true })(doc),

  run(doc) {
    checkNotExists(MoneyAccounts, { communityId: doc.communityId, digit: doc.digit });
    checkPermissions(this.userId, 'moneyAccounts.insert', doc);

    return MoneyAccounts.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'moneyAccounts.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(MoneyAccounts, _id);
    checkModifier(doc, modifier, ['digit'], true);
    checkPermissions(this.userId, 'moneyAccounts.update', doc);

    MoneyAccounts.update({ _id }, modifier, { selector: { category: doc.category } });
  },
});

export const remove = new ValidatedMethod({
  name: 'moneyAccounts.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(MoneyAccounts, _id);
    checkPermissions(this.userId, 'moneyAccounts.remove', doc);
    MoneyAccounts.remove(_id);
  },
});

MoneyAccounts.methods = MoneyAccounts.methods || {};
_.extend(MoneyAccounts.methods, { insert, update, remove });
