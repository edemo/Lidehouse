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

Transactions.categoryHelpers('opening', {
  makeJournalEntries() {
    const self = this;
    let subTx = 0;
    const newDebitEntries = [];
    const newCreditEntries = [];
    const openingAccount = Accounts.getByName('Opening account', this.communityId).code;
    this.debit?.forEach(je => {
      if (je.subTx !== undefined) { subTx = je.subTx + 1; return; }
      je.subTx = subTx++;
      const account = Accounts.isTechnicalCode(je.account) ? Accounts.toTechnicalCode(openingAccount) : openingAccount;
      newCreditEntries.push(_.extend({}, je, { account }));
    });
    this.credit?.forEach(je => {
      if (je.subTx !== undefined) { subTx = je.subTx + 1; return; }
      je.subTx = subTx++;
      const account = Accounts.isTechnicalCode(je.account) ? Accounts.toTechnicalCode(openingAccount) : openingAccount;
      newDebitEntries.push(_.extend({}, je, { account }));
    });
    this.debit = (this.debit || []).concat(newDebitEntries);
    this.credit = newCreditEntries.concat(this.credit || []);
    this.debit?.forEach(je => self.cleanJournalEntry(je));
    this.credit?.forEach(je => self.cleanJournalEntry(je));
    return { debit: this.debit, credit: this.credit };
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    // Nothing to do here
  },
});

Transactions.attachVariantSchema(freeTxSchema, { selector: { category: 'opening' } });

Transactions.simpleSchema({ category: 'opening' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('opening', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'opening',
  amount: 1000,
  debit: [{ account: '`38' }],
});
