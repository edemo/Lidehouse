import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Bills, BillAndReceiptHelpers } from '/imports/api/transactions/bills/bills.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';

const receiptSchema = new SimpleSchema([
  Transactions.partnerSchema, {
    // amount overrides non-optional value of transactions, with optional & calculated value
    amount: { type: Number, decimal: true, optional: true },
    tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
    title: { type: String, max: 200, optional: true }, // title here used only when there are no lines
    lines: { type: Array, defaultValue: [] },
    'lines.$': { type: Bills.lineSchema },
    payAccount: { type: String, autoform: chooseConteerAccount(true) }, // the money account paid to/from
  },
]);

Transactions.categoryHelpers('receipt', {
  ...BillAndReceiptHelpers,
  fillFromStatementEntry(entry) {
    this.payAccount = entry.account;
    const title =  entry.note || __(this.txdef().name);
    this.lines = [{ title, quantity: 1, unitPrice: Math.abs(entry.amount) }];
  },
  makeJournalEntries() {
    const self = this;
    function copyLinesInto(txSide) {
      self.getLines().forEach(line => {
        self.makeEntry(txSide, { amount: line.amount, account: line.account, localizer: line.localizer });
      });
    }
    this.debit = [];
    this.credit = [];
    copyLinesInto(this.conteerSide());
    this.makeEntry(this.relationSide(), { account: this.payAccount });
    return { debit: this.debit, credit: this.credit };
  },
  displayInSelect() {
    return `${this.serialId} (${moment(this.valueDate).format('YYYY.MM.DD')} ${this.partner()} ${this.amount})`;
  },
});

Transactions.attachVariantSchema(receiptSchema, { selector: { category: 'receipt' } });

Transactions.simpleSchema({ category: 'receipt' }).i18n('schemaTransactions');
Transactions.simpleSchema({ category: 'receipt' }).i18n('schemaBills');

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
