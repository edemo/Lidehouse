import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId } from '/imports/api/communities/communities.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';

export const Bills = new Mongo.Collection('bills');

Bills.categoryValues = ['in', 'out', 'parcel'];

Bills.paymentSchema = new SimpleSchema({
  valueDate: { type: Date },
  amount: { type: Number },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id },
});

Bills.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Bills.categoryValues, autoform: { omit: true } },
  partner: { type: String, optional: true },
  account: { type: String, optional: true },
  localizer: { type: String, optional: true },
  amount: { type: Number, decimal: true },
  issueDate: { type: Date },
  valueDate: { type: Date },
  dueDate: { type: Date },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id },
  payments: { type: Array, optional: true },
  'payments.$': { type: Bills.paymentSchema },
  outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } }, // cached value, so client ask to sort on outstanding amount
//  closed: { type: Boolean, optional: true },  // can use outstanding === 0 for now
});

export function matchBillSchema() {
  const autoformOptions = {
    options() {
      const bills = Bills.find({ communityId: getActiveCommunityId(), outstanding: { $gt: 0 } }).fetch();
      return bills.map(function option(bill) { return { label: bill.display(), value: bill._id }; });
    },
    firstOption: () => __('(Select one)'),
  };
  return new SimpleSchema({
    txId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
    billId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: autoformOptions },
  });
}
Meteor.startup(function indexBills() {
  if (Meteor.isClient && MinimongoIndexing) {
    Bills._collection._ensureIndex('category');
  } else if (Meteor.isServer) {
    Bills._ensureIndex({ communityId: 1, category: 1, serial: 1 });
    Bills._ensureIndex({ communityId: 1, category: 1, outstanding: -1 });
  }
});

Bills.helpers({
  paymentCount() {
    return this.payments.length;
  },
  calculateOutstanding() {
    let paid = 0;
    if (this.payments) this.payments.forEach(p => paid += p.amount);
    return this.amount - paid;
  },
  display() {
    return `${moment(this.valueDate).format('L')} ${this.partner} ${this.amount}`;
  },
});

// --- Before/after actions ---
if (Meteor.isServer) {
  Bills.before.update(function (userId, doc, fieldNames, modifier, options) {
    let paid = 0;
    this.payments.forEach(p => paid += p.amount);
    this.outstanding = this.amount - paid;
  });
}

Bills.attachSchema(Bills.schema);
Bills.attachBehaviour(Timestamped);
Bills.attachBehaviour(SerialId(Bills, ['category']));

Meteor.startup(function attach() {
  Bills.simpleSchema().i18n('schemaBills');
});

// --- Factory ---

Factory.define('invoice', Bills, {
  communityId: () => Factory.get('community'),
  category: 'in',
  amount: faker.random.number(10000),
});

/*
Bills.Payments.schema = new SimpleSchema({
  amount: { type: Number },
  valueDate: { type: Date },
  bills: { type: Array },
  'bills.$': { type: FulfillmentSchema },
});

export const BankStatements = new Mongo.Collection('bankStatements');

BankStatements.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  payments: { type: [Payments.schema] },
});
*/