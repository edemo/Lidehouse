import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

const exchangeSchema = new SimpleSchema({
  sourcePartnerId: { type: String, regEx: SimpleSchema.RegEx.Id },
  sourceContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
  targetPartnerId: { type: String, regEx: SimpleSchema.RegEx.Id },
  targetContractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
});

Transactions.categoryHelpers('exchange', {
  makeJournalEntries(accountingMethod) {
    // Exchange only effects partner accounts, does not touch the chart of accounts
  },
  makePartnerEntries() {
    this.pEntries = [{
      partner: Partners.code(this.sourcePartnerId, this.sourceContractId),
      side: 'credit',
      amount: this.amount,
    }, {
      partner: Partners.code(this.targetPartnerId, this.targetContractId),
      side: 'debit',
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
  sourcePartnerId: () => Factory.get('member'),
  targetPartnerId: () => Factory.get('member'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
