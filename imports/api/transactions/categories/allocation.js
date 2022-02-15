import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Clock } from '/imports/utils/clock.js';
import { Relations } from '/imports/api/core/relations.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Payments, PaymentAndAllocationHelpers } from '/imports/api/transactions/payments/payments.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';

const allocationSchema = new SimpleSchema([{
  relation: { type: String, allowedValues: Relations.values, autoform: { type: 'hidden' } },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner, readonly: true } },
  contractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...chooseContract, readonly: true } },
  bills: { type: [Payments.billPaidSchema], optional: true },
  lines: { type: [Payments.lineSchema], optional: true },
  paymentId: { type: String, regEx: SimpleSchema.RegEx.Id },
  sourceAccount: { type: String, autoform: { readonly: true } },
}]);

Meteor.startup(function indexAllocations() {
  if (Meteor.isServer) {
    Transactions._ensureIndex({ paymentId: 1 });
  }
});

Transactions.categoryHelpers('allocation', {
  ...PaymentAndAllocationHelpers,
  payment() {
    return Transactions.findOne(this.paymentId);
  },
});

Transactions.attachVariantSchema(allocationSchema, { selector: { category: 'allocation' } });

Transactions.simpleSchema({ category: 'allocation' }).i18n('schemaTransactions');
Transactions.simpleSchema({ category: 'allocation' }).i18n('schemaPayments');
Transactions.simpleSchema({ category: 'allocation' }).i18n('schemaAllocations');

// --- Factory ---

Factory.define('allocation', Transactions, {
  category: 'allocation',
//  billId: () => Factory.get('bill'),
  relation: 'supplier',
//  partnerId: () => Factory.get('supplier'),
//  contractId: () => Factory.get('contract'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
  sourceAccount: '`431',
});
