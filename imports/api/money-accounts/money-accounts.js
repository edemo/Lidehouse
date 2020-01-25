import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert, releaseAssert } from '/imports/utils/assert.js';
import { autoformOptions, fileUpload } from '/imports/utils/autoform.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Communities } from '/imports/api/communities/communities.js';

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
  bank: { type: String, max: 100, optional: true },
  BAN: { type: String, max: 100, optional: true },  // Bank Account Number
  sync: { type: String, defaultValue: 'none', allowedValues: MoneyAccounts.syncValues, autoform: _.extend({ value: 'none' }, autoformOptions(MoneyAccounts.syncValues, 'schemaMoneyAccounts.sync.')) },
//  protocol: { type: String, optional: true },
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

// --- Before/after actions ---

function regenerateBreakdown(communityId) {
  const breakdown = { communityId, name: 'Money accounts' /* digit: '-' */, children: [] };
  MoneyAccounts.find({ communityId }, { sort: { digit: +1 } }).forEach((account) => {
    breakdown.children.push({ digit: account.digit, name: account.name });
  });
  Breakdowns.define(breakdown);
}

if (Meteor.isServer) {
  MoneyAccounts.after.insert(function (userId, doc) {
    regenerateBreakdown(doc.communityId);
  });

  MoneyAccounts.after.update(function (userId, doc, fieldNames, modifier, options) {
    regenerateBreakdown(doc.communityId);
  });

  MoneyAccounts.after.remove(function (userId, doc) {
    regenerateBreakdown(doc.communityId);
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
  category: 'cash',
  digit: '1',
  primary: true,
});

Factory.define('bankAccount', MoneyAccounts, {
  name: () => 'bankszla' + faker.random.word(),
  category: 'bank',
  digit: '2',
  primary: true,
  BAN: faker.finance.account(8) + '-' + faker.finance.account(8) + '-' + faker.finance.account(8),
  sync: 'manual',
});
