import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Contracts, choosePartnerContract } from '/imports/api/contracts/contracts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs, chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';

const exchangeSchema = new SimpleSchema({
  account: { type: String, optional: true, autoform: chooseConteerAccount('debit') },
//  toPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
//  toContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  toPartner: { type: String, optional: true, autoform: { ...choosePartnerContract } },
//  fromPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
//  fromContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  fromPartner: { type: String, optional: true, autoform: { ...choosePartnerContract } },
});

Transactions.categoryHelpers('exchange', {
  makeJournalEntries(accountingMethod) {
    this.debit = [{ amount: this.amount, account: this.account, partner: this.fromPartner }];
    this.credit = [{ amount: this.amount, account: this.account, partner: this.toPartner }];
    return { debit: this.debit, credit: this.credit };
  },
});

Transactions.attachVariantSchema(exchangeSchema, { selector: { category: 'exchange' } });

Transactions.simpleSchema({ category: 'exchange' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('exchange', Transactions, {
  category: 'exchange',
  account: () => '`431',
  fromPartner: () => Factory.get('member'),
  toPartner: () => Factory.get('member'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
