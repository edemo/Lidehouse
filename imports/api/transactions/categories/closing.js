import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs, chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { freeTxSchema } from './free-tx.js';

Transactions.categoryHelpers('closing', {
  makeJournalEntries() {
    const self = this;
    let subTx = 0;
    const newDebitEntries = [];
    const newCreditEntries = [];
    const closingAccount = Accounts.getByName('Closing account', this.communityId).code;
    this.debit?.forEach(je => {
      if (je.subTx) { subTx = je.SubTx + 1; return; }
      je.subTx = subTx++;
      newCreditEntries.push(_.extend({}, je, { account: closingAccount }));
    });
    this.credit?.forEach(je => {
      if (je.subTx) { subTx = je.SubTx + 1; return; }
      je.subTx = subTx++;
      newDebitEntries.push(_.extend({}, je, { account: closingAccount }));
    });
    this.debit = (this.debit || []).concat(newDebitEntries);
    this.credit = (this.credit || []).concat(newCreditEntries);
    this.debit?.forEach(je => self.cleanJournalEntry(je));
    this.credit?.forEach(je => self.cleanJournalEntry(je));
    return { debit: this.debit, credit: this.credit };
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    // Nothing to do here
  },
});

Transactions.attachVariantSchema(freeTxSchema, { selector: { category: 'closing' } });

Transactions.simpleSchema({ category: 'closing' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('closing', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'closing',
  amount: 1000,
  debit: [{ account: '`88' }],
});
