import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

const transferSchema = new SimpleSchema({
  fromAccount: { type: String, optional: true, autoform: chooseSubAccount('COA', '38') },  // the money account paid to/from
  toAccount: { type: String, optional: true, autoform: chooseSubAccount('COA', '38') },  // the money account paid to/from
});

Transactions.attachVariantSchema(transferSchema, { selector: { category: 'transfer' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'transfer' }).i18n('schemaTransactions');
});

// --- Factory ---

Factory.define('transfer', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'transfer',
  debit: [],
  credit: [],
});
