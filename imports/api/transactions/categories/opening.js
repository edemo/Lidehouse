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

const openingSchema = new SimpleSchema({
//  side: { type: String, allowedValues: ['debit', 'credit'] },
  account: { type: String, autoform: chooseConteerAccount() },
// autoform: Accounts.chooseSubNode('COA', '??')
});

Transactions.categoryHelpers('opening', {
  makeJournalEntries() {
    const txdef = Txdefs.findOne(this.defId);
    const side = txdef.data.side;
    const otherSide = Transactions.oppositeSide(side);
    productionAssert(txdef[otherSide].length === 1, 'Opening tx has cannot have multiple choices for the opposite account');
    const otherAccount = txdef[otherSide][0];
    this[side] = [{ account: this.account, amount: this.amount }];
    this[otherSide] = [{ account: otherAccount, amount: this.amount }];
    return { debit: this.debit, credit: this.credit };
  },
});

Transactions.attachVariantSchema(openingSchema, { selector: { category: 'opening' } });

Transactions.simpleSchema({ category: 'opening' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('opening', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'opening',
  side: 'debit',
  amount: 1000,
});
