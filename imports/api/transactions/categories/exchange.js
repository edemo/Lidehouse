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

const exchangeSchema = new SimpleSchema({
//  toPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
//  toContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  toPartner: { type: String, autoform: { ...choosePartnerContract } },
//  fromPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
//  fromContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  fromPartner: { type: String, autoform: { ...choosePartnerContract } },
});

Transactions.categoryHelpers('exchange', {
  makeJournalEntries(accountingMethod) {
    // Exchange only effects partner accounts, does not touch the chart of accounts
  },
  makePartnerEntries() {
    this.pEntries = [{
      partner: this.toPartner, // Partners.code(this.targetPartnerId, this.targetContractId),
      side: 'debit',
      amount: this.amount,
    }, {
      partner: this.fromPartner, // Partners.code(this.sourcePartnerId, this.sourceContractId),
      side: 'credit',
      amount: this.amount,
    }];
    return { pEntries: this.pEntries };
  },
});

Transactions.attachVariantSchema(exchangeSchema, { selector: { category: 'exchange' } });

Transactions.simpleSchema({ category: 'exchange' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('exchange', Transactions, {
  category: 'exchange',
  fromPartner: () => Factory.get('member'),
  toPartner: () => Factory.get('member'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
