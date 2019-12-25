import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert, releaseAssert } from '/imports/utils/assert.js';
import { comtype } from '/imports/comtypes/comtype.js';
import { autoformOptions, fileUpload } from '/imports/utils/autoform.js';
import { displayAddress } from '/imports/localization/localization.js';
import { availableLanguages } from '/imports/startup/both/language.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

export const MoneyAccounts = new Mongo.Collection('moneyAccounts');

MoneyAccounts.categoryValues = ['cash', 'bank'];
MoneyAccounts.syncValues = ['none', 'manual', 'auto'];

MoneyAccounts.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: MoneyAccounts.categoryValues, autoform: { omit: true } }, //autoform: _.extend({ value: 'bank' }, autoformOptions(MoneyAccounts.categoryValues, 'schemaMoneyAccounts.category.')) },
  name: { type: String, max: 100 },
  digit: { type: String, max: 1 },  // Accounting Breakdown Digit
  primary: { type: Boolean, optional: true },
});

MoneyAccounts.bankExtensionSchema = new SimpleSchema({
  ban: { type: String, max: 100, optional: true },  // Bank Account Number
  sync: { type: String, defaultValue: 'none', allowedValues: MoneyAccounts.syncValues, autoform: _.extend({ value: 'none' }, autoformOptions(MoneyAccounts.syncValues, 'schemaMoneyAccounts.sync.')) },
  protocol: { type: String, optional: true },
});

Meteor.startup(function indexMoneyAccounts() {
  if (Meteor.isServer) {
    MoneyAccounts._ensureIndex({ communityId: 1, primary: 1 });
    MoneyAccounts._ensureIndex({ accountNumber: 1 });
  }
});

MoneyAccounts.helpers({
  entityName() {
    return this.category + 'Account';
  },
});

MoneyAccounts.attachBaseSchema(MoneyAccounts.schema);
MoneyAccounts.attachBehaviour(Timestamped);

MoneyAccounts.attachVariantSchema(undefined, { selector: { category: 'cash' } });
MoneyAccounts.attachVariantSchema(MoneyAccounts.bankExtensionSchema, { selector: { category: 'bank' } });

Meteor.startup(function attach() {
  MoneyAccounts.simpleSchema({ category: 'cash' }).i18n('schemaMoneyAccounts');
  MoneyAccounts.simpleSchema({ category: 'bank' }).i18n('schemaMoneyAccounts');
});

if (Meteor.isServer) {
  MoneyAccounts.after.insert(function (userId, doc) {
    // update breakdown
  });
}

// --- Factory ---

Factory.define('moneyAccount', MoneyAccounts, {
  name: () => 'penzszla' + faker.random.word(),
  digit: '1',
  primary: true,
});

Factory.define('cashAccount', MoneyAccounts, {
  name: () => 'penzszla' + faker.random.word(),
  digit: '1',
  primary: true,
});

Factory.define('bankAccount', MoneyAccounts, {
  name: () => 'bankszla' + faker.random.word(),
  digit: '2',
  primary: true,
  ban: faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  sync: 'manual',
});
