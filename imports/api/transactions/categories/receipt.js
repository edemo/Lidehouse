import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';

const receiptSchema = new SimpleSchema({
  partnerTxt: { type: String, max: 100, optional: true },
  relation: { type: String, allowedValues: Partners.relationValues, autoform: { omit: true } },
  // amount overrides non-optional value of transactions, with optional & calculated value
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  lines: { type: Array, defaultValue: [] },
  'lines.$': { type: Bills.lineSchema },
  payAccount: { type: String, optional: true, autoform: chooseSubAccount('COA', '38') },  // the money account paid to/from
});

Transactions.categoryHelpers('receipt', {
  post() {
    function copyLinesInto(txSide) {
      this.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        txSide.push({ amount: line.amount, account: line.account, localizer: line.localizer });
      });
    }
    if (this.relation === 'supplier') {
      this.debit = []; copyLinesInto(this.debit);
      this.credit = [{ account: this.payAccount }];
    } else if (this.relation === 'customer') {
      this.debit = [{ account: this.payAccount }];
      this.credit = []; copyLinesInto(this.credit);
    } else debugAssert(false, 'No such receipt relation');

    return { debit: this.debit, credit: this.credit };
  },
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
