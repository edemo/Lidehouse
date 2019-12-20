import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';

const receiptSchema = new SimpleSchema({
  relation: { type: String, allowedValues: Partners.relationValues, autoform: { omit: true } },
});

Transactions.attachVariantSchema(receiptSchema, { selector: { category: 'receipt' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'receipt' }).i18n('schemaTransactions');
});

// --- Factory ---

Factory.define('receipt', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'receipt',
  relation: 'customer',
  debit: [],
  credit: [],
});

Factory.define('income', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'receipt',
  relation: 'customer',
  debit: [],
  credit: [],
});

Factory.define('expense', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'receipt',
  relation: 'supplier',
  debit: [],
  credit: [],
});
