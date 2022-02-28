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

const freeTxSchema = new SimpleSchema({
    // Would it be better to store the je data in the tx and copy over the data, when posting? 
    // So that no journalEntries would exist in the db until then.

    // debitData: { type: [Transactions.entrySchema], optional: true },
    // creditData: { type: [Transactions.entrySchema], optional: true },

    // Migration: Transactions.direct.update(tx._id, { $set: { creditData: tx.credit, debitData: tx.debit }, $unset: { credit: '', debit: '' } });
});

Transactions.categoryHelpers('freeTx', {
  makeJournalEntries() {
    const self = this;
    function clean(entry) {
      if (!entry.amount) entry.amount = self.amount;
      if (!Accounts.needsLocalization(entry.account, self.communityId)) {
        delete entry.partner;
        delete entry.localizer;
        delete entry.parcelId;
      }
    }
    this.debit.forEach(je => clean(je));
    this.credit.forEach(je => clean(je));
    return { debit: this.debit, credit: this.credit };
  },
});

Transactions.attachVariantSchema(freeTxSchema, { selector: { category: 'freeTx' } });

Transactions.simpleSchema({ category: 'freeTx' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('freeTx', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'freeTx',
  amount: 1000,
  debit: [{ account: '`38' }],
  credit: [{ account: '`9' }],
});
