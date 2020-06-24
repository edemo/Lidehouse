import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

const transferSchema = new SimpleSchema({
  fromAccount: { type: String, optional: true, autoform: chooseConteerAccount('credit') },
  toAccount: { type: String, optional: true, autoform: chooseConteerAccount('debit') },
});

Transactions.categoryHelpers('transfer', {
  makeJournalEntries() {
    this.debit = [{ account: this.toAccount }];
    this.credit = [{ account: this.fromAccount }];
    return { debit: this.debit, credit: this.credit };
  },
});

Transactions.attachVariantSchema(transferSchema, { selector: { category: 'transfer' } });

Transactions.simpleSchema({ category: 'transfer' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('transfer', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'transfer',
  debit: [],
  credit: [],
});
