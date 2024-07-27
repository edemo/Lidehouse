import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

const transferSchema = new SimpleSchema({
//  amount: { type: Number, decimal: true, autoform: { readonly() { return !!ModalStack.getVar('statementEntry'); } } }, // same as Tx, but we need the readonly added
  toAccount: { type: String, optional: true, autoform: chooseConteerAccount('debit') },
  fromAccount: { type: String, optional: true, autoform: chooseConteerAccount('credit') },
});

Transactions.categoryHelpers('transfer', {
  fillFromStatementEntry(entry) {
    if (entry.amount >= 0) {
      this.toAccount = entry.account;
      this.amount = entry.amount;
    } else {
      this.fromAccount = entry.account;
      this.amount = -1 * entry.amount;
    }
  },
  makeJournalEntries() {
    this.debit = [{ account: this.toAccount, amount: this.amount }];
    this.credit = [{ account: this.fromAccount, amount: this.amount }];
    return { debit: this.debit, credit: this.credit };
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    let updated = false;
    if (this.fromAccount?.startsWith(codeFrom)) {
      this.fromAccount = this.fromAccount.replace(codeFrom, codeTo);
      updated = true;
    }
    if (this.toAccount?.startsWith(codeFrom)) {
      this.toAccount = this.toAccount.replace(codeFrom, codeTo);
      updated = true;
    }
    return updated;
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
