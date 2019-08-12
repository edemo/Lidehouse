import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
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
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
//  paymentId: { type: Number, decimal: true },
});

Bills.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Bills.categoryValues, autoform: { omit: true } },
  amount: { type: Number, decimal: true },
  issueDate: { type: Date },
  valueDate: { type: Date },
  dueDate: { type: Date },
  partner: { type: String, optional: true },
  account: { type: String, optional: true },
  localizer: { type: String, optional: true },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  payments: { type: Array, defaultValue: [] },
  'payments.$': { type: Bills.paymentSchema },
  outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } }, // cached value, so client ask to sort on outstanding amount
//  closed: { type: Boolean, optional: true },  // can use outstanding === 0 for now
});

Bills.modifiableFields = ['amount', 'issueDate', 'valueDate', 'dueDate', 'partner'];

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
  makeTx() {
    const tx = {
      communityId: this.communityId,
      valueDate: this.valueDate,  // ?? paymentDate for single entry accounting ??
      amount: this.amount,
      billId: this._id,
      paymentId: undefined, // it is not a payment
    };
    if (this.category === 'in') {
      tx.debit = [{ account: this.account, localizer: this.localizer }];
      tx.credit = [{ account: '46', billId: this._id }];
    } else if (this.category === 'out') {
      tx.debit = [{ account: '31', billId: this._id }];
      tx.credit = [{ account: this.account, localizer: this.localizer }];
    } else {
      debugAssert(this.category === 'parcel');
      // ...
    }
    return tx;
  },
  display() {
    return `${moment(this.valueDate).format('L')} ${this.partner} ${this.amount}`;
  },
});

// --- Before/after actions ---
if (Meteor.isServer) {
  Bills.before.insert(function (userId, doc) {
    const tdoc = this.transform();
    doc.outstanding = tdoc.calculateOutstanding();
  });
  Bills.after.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform();
//--------------------
//  Could do this with rusdiff in a before.update
//    let newDoc = rusdiff.clone(doc);
//    if (modifier) rusdiff.apply(newDoc, modifier);
//    newDoc = Bills._transform(newDoc);
//    const outstanding = newDoc.calculateOutstanding();
//--------------------
    if ((modifier.$set && modifier.$set.payments) || (modifier.$push && modifier.$push.payments)) {
      if (!modifier.$set || modifier.$set.outstanding === undefined) { // avoid infinite update loop!
        Bills.update(doc._id, { $set: { outstanding: tdoc.calculateOutstanding() } });
      }
    }
  });
}

Bills.attachSchema(Bills.schema);
Bills.attachBehaviour(Timestamped);
Bills.attachBehaviour(SerialId(Bills, ['category']));

Meteor.startup(function attach() {
  Bills.simpleSchema().i18n('schemaBills');
});

// --- Factory ---

Factory.define('bill', Bills, {
  communityId: () => Factory.get('community'),
  partner: faker.random.word(),
//  account: { type: String, optional: true },
//  localizer: { type: String, optional: true },
  amount: faker.random.number(10000),
  issueDate: Clock.currentDate(),
  valueDate: Clock.currentDate(),
  dueDate: Clock.currentDate(),
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