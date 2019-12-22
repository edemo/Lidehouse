import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

const openingSchema = new SimpleSchema({
  account: { type: String, autoform: chooseSubAccount('COA', '') },
});

Transactions.categoryHelpers('opening', {
  post() {
    this.debit = [{ account: this.account }];
    this.credit = [{ account: '0' }];
  },
});

Transactions.attachVariantSchema(openingSchema, { selector: { category: 'opening' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'opening' }).i18n('schemaTransactions');
});

// --- Factory ---

Factory.define('opening', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'opening',
  debit: [],
  credit: [],
});
