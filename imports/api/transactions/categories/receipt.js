import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';

const receiptSchema = new SimpleSchema({
  partnerName: { type: String, max: 100, optional: true },
  relation: { type: String, allowedValues: Partners.relationValues, autoform: { omit: true } },
  // amount overrides non-optional value of transactions, with optional & calculated value
  amount: { type: Number, decimal: true, optional: true },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  title: { type: String, max: 200, optional: true }, // title here used only when there are no lines
  lines: { type: Array, defaultValue: [] },
  'lines.$': { type: Bills.lineSchema },
  payAccount: { type: String, autoform: chooseConteerAccount(true) }, // the money account paid to/from
});

Transactions.categoryHelpers('receipt', {
  makeJournalEntries() {
    const self = this;
    function copyLinesInto(txSide) {
      self.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        txSide.push({ amount: line.amount, account: line.account, localizer: line.localizer });
      });
    }
    this[this.conteerSide()] = []; copyLinesInto(this[this.conteerSide()]);
    this[this.relationSide()] = [{ account: this.payAccount }];

    return { debit: this.debit, credit: this.credit };
  },
});

Transactions.attachVariantSchema(receiptSchema, { selector: { category: 'receipt' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'receipt' }).i18n('schemaTransactions');
  Transactions.simpleSchema({ category: 'receipt' }).i18n('schemaBills');
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
