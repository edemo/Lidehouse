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
import { Communities, getActiveCommunityId } from '/imports/api/communities/communities.js';
import { oppositeSide } from '/imports/api/transactions/transactions.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';

export const Bills = new Mongo.Collection('bills');

Bills.categoryValues = ['in', 'out', 'parcel'];

Bills.lineSchema = new SimpleSchema({
  title: { type: String },
  details: { type: String, optional: true },
  uom: { type: String, optional: true },  // unit of measurment
  quantity: { type: Number, decimal: true },
  unitPrice: { type: Number, decimal: true },
  taxPct: { type: Number, decimal: true, defaultValue: 0 },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true } },
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true } },
  // autoValue() {
  //  return this.siblingField('quantity').value * this.siblingField('unitPrice').value;
  //} },
  account: { type: String, optional: true, autoform: chooseAccountNode },
  localizer: { type: String, optional: true },
});

Bills.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Bills.categoryValues, autoform: { omit: true } },
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true } },
  /*autoValue() {
    const lines = this.field('lines');
    if (!lines) return undefined;
    const result = 0;
    lines.forEach(line => result += line.amount)
    return 
  } },*/
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true } },
  issueDate: { type: Date },
  valueDate: { type: Date },
  dueDate: { type: Date },
  partner: { type: String, optional: true },
  lines: { type: Array, defaultValue: [] },
  'lines.$': { type: Bills.lineSchema },
  payments: { type: Array, defaultValue: [] },
  'payments.$': { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } }, // cached value, so client can ask to sort on outstanding amount
//  closed: { type: Boolean, optional: true },  // can use outstanding === 0 for now
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

Bills.modifiableFields = ['amount', 'issueDate', 'valueDate', 'dueDate', 'partner'];

Meteor.startup(function indexBills() {
  if (Meteor.isClient && MinimongoIndexing) {
    Bills._collection._ensureIndex('category');
  } else if (Meteor.isServer) {
    Bills._ensureIndex({ communityId: 1, category: 1, serial: 1 });
    Bills._ensureIndex({ communityId: 1, category: 1, outstanding: -1 });
  }
});

Bills.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  matchingTxSide() {
    if (this.category === 'in') return 'debit';
    else if (this.category === 'out' || this.category === 'parcel') return 'credit';
    debugAssert(false, 'unknown bill category');
    return undefined;
  },
  otherTxSide() {
    return oppositeSide(this.matchingTxSide());
  },
  isConteered() {
    return !!this.txId;
  },
  hasConteerData() {
    let result = true;
    this.lines.forEach(line => { if (!line.account) result = false; });
    return result;
  },
  getPayments() {
    return (this.payments || []).map(id => Payments.findOne(id));
  },
  paymentCount() {
    return this.payments.length;
  },
  makeTx() {
    const self = this;
    const tx = {
      _id: this._id,
      communityId: this.communityId,
      type: 'Bills',
      // def: 'bill'
      valueDate: this.valueDate,
      amount: this.amount,
    };
    function copyLinesInto(txSide) {
      self.lines.forEach(line => txSide.push({ amount: line.amount, account: line.account, localizer: line.localizer }));
    }
    if (this.category === 'in') {
      tx.debit = []; copyLinesInto(tx.debit);
      tx.credit = [{ account: '46' }];
    } else if (this.category === 'out') {
      tx.debit = [{ account: '31' }];
      tx.credit = []; copyLinesInto(tx.credit);
    } else if (this.category === 'parcel') {
      tx.debit = [{ account: '33'+'' }];  // line.account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.payinType;
      tx.credit = []; copyLinesInto(tx.credit);
    } else debugAssert(false, 'No such bill category');
    return tx;
  },
  display() {
    return `${moment(this.valueDate).format('L')} ${this.partner} ${this.amount}`;
  },
});

Bills.autofillLines = function autofillAmounts(doc) {
  let totalAmount = 0;
  let totalTax = 0;
  if (doc.lines) {
    doc.lines.forEach(line => {
      line.amount = line.unitPrice * line.quantity;
      line.tax = line.amount * line.taxPct;
      line.amount += line.tax; // =
      totalAmount += line.amount;
      totalTax += line.tax;
    });
  }
  doc.amount = totalAmount;
  doc.tax = totalTax;
};
Bills.autofillOutstanding = function autofillAmounts(doc) {
  const tdoc = Bills._transform(doc);
  let paid = 0;
  tdoc.getPayments().forEach(p => paid += p.amount);
  doc.outstanding = doc.amount - paid;
};

// --- Before/after actions ---
if (Meteor.isServer) {
  Bills.before.insert(function (userId, doc) {
    Bills.autofillLines(doc);
    Bills.autofillOutstanding(doc);
  });

  Bills.before.update(function (userId, doc, fieldNames, modifier, options) {
    const newDoc = modifier.$set;
    if (newDoc.lines) Bills.autofillLines(newDoc);
    if (newDoc.lines || newDoc.payments) Bills.autofillOutstanding(newDoc);
  });

  Bills.after.update(function (userId, doc, fieldNames, modifier, options) {
//    const tdoc = this.transform();
//--------------------
//  Could do this with rusdiff in a before.update
//    let newDoc = rusdiff.clone(doc);
//    if (modifier) rusdiff.apply(newDoc, modifier);
//    newDoc = Bills._transform(newDoc);
//    const outstanding = newDoc.calculateOutstanding();
//--------------------
//    if ((modifier.$set && modifier.$set.payments) || (modifier.$push && modifier.$push.payments)) {
//      if (!modifier.$set || modifier.$set.outstanding === undefined) { // avoid infinite update loop!
//        Bills.update(doc._id, { $set: { outstanding: tdoc.calculateOutstanding() } });
//      }
//    }
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
  issueDate: Clock.currentDate(),
  valueDate: Clock.currentDate(),
  dueDate: Clock.currentDate(),
  partner: faker.random.word(),
//  account: { type: String, optional: true },
//  localizer: { type: String, optional: true },
  lines: [{
    title: faker.random.word(),
    uom: 'piece',
    quantity: 1,
    unitPrice: faker.random.number(10000),
    account: '85',
    localizer: '@',
  }],
});
