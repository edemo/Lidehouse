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
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Localizer, chooseLocalizerNode } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Bills = {};

export const choosePayment = {
  options() {
    const communityId = Session.get('activeCommunityId');
    const payments = Transactions.find({ communityId, category: 'payment', reconciledId: { $exists: false } });
    const options = payments.map(function option(payment) {
      return { label: `${payment.partner()} ${moment(payment.valueDate).format('L')} ${payment.amount} ${payment.note || ''}`, value: payment._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

const lineSchema = {
  title: { type: String },
  details: { type: String, optional: true },
  uom: { type: String, optional: true },  // unit of measurment
  quantity: { type: Number, decimal: true },
  unitPrice: { type: Number, decimal: true },
  taxPct: { type: Number, decimal: true, defaultValue: 0 },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  // autoValue() {
  //  return this.siblingField('quantity').value * this.siblingField('unitPrice').value;
  //} },
  billingId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  period: { type: String, optional: true, autoform: { omit: true } },
  account: { type: String, optional: true, autoform: chooseConteerAccount },
  localizer: { type: String, optional: true, autoform: chooseLocalizerNode },
};
_.each(lineSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Bills.lineSchema = new SimpleSchema(lineSchema);

Bills.receiptSchema = new SimpleSchema({
  // amount overrides non-optional value of transactions, with optional & calculated value
  amount: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  tax: { type: Number, decimal: true, optional: true, autoform: { omit: true, readonly: true } },
  lines: { type: Array, defaultValue: [] },
  'lines.$': { type: Bills.lineSchema },
});

Bills.paymentSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: choosePayment },
  amount: { type: Number, decimal: true },
});

Bills.extensionSchema = new SimpleSchema([
  Transactions.partnerSchema,
  Bills.receiptSchema, {
    valueDate: { type: Date, autoValue() { return this.field('deliveryDate').value; }, autoform: { omit: true } },
    issueDate: { type: Date },
    deliveryDate: { type: Date },
    dueDate: { type: Date },
    payments: { type: [Bills.paymentSchema], defaultValue: [] },
    outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } }, // cached value
  //  closed: { type: Boolean, optional: true },  // can use outstanding === 0 for now
  },
]);

Bills.modifiableFields = ['amount', 'issueDate', 'valueDate', 'dueDate', 'partnerId'];

Meteor.startup(function indexBills() {
  if (Meteor.isClient && MinimongoIndexing) {
  } else if (Meteor.isServer) {
    Transactions._ensureIndex({ communityId: 1, relation: 1, outstanding: -1 });
  }
});

Transactions.categoryHelpers('bill', {
  getPayments() {
    return (this.payments || []);
  },
  getPaymentTransactions() {
    return this.getPayments().map(payment => Transactions.findOne(payment.id));
  },
  paymentCount() {
    return this.getPayments().length;
  },
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'bill', 'data.relation': this.relation });
    if (accountingMethod === 'accrual') {
      this.debit = [];
      this.credit = [];
      this.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        this[this.conteerSide()].push({ amount: line.amount, account: line.account, localizer: line.localizer, parcelId: line.parcelId });
        let contraAccount = this.relationAccount();
        if (this.relation === 'parcel') contraAccount += ParcelBillings.findOne(line.billingId).digit;
        this[this.relationSide()].push({ amount: line.amount, account: contraAccount, localizer: line.localizer, parcelId: line.parcelId });
      });
    } // else if (accountingMethod === 'cash') >> we have no accounting to do
    return { debit: this.debit, credit: this.credit };
  },
  autofillOutstanding() {
    let paid = 0;
    this.getPayments().forEach(p => paid += p.amount);
    this.outstanding = this.amount - paid;
  },
  updateOutstandings(directionSign) {
    if (Meteor.isClient) return;
    debugAssert(this.partnerId, 'Cannot process a bill without a partner');
    Partners.update(this.partnerId, { $inc: { outstanding: directionSign * this.amount } });
    Memberships.update(this.membershipId, { $inc: { outstanding: directionSign * this.amount } });
    if (this.relation === 'parcel') {
      this.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        debugAssert(line.parcelId, 'Cannot process a parcel bill without parcelId field');
        Parcels.update(line.parcelId, { $inc: { outstanding: directionSign * line.amount } });
      });
    }
  },
  display() {
    return `${moment(this.deliveryDate).format('L')} ${this.partner()} ${this.amount}`;
  },
  displayInHistory() {
    return __(this.category) + (this.lineCount() ? ` (${this.lineCount()} ${__('item')})` : '');
  },
  overdueDays() {
    const diff = moment().diff(this.dueDate, 'days');
    if (diff < 0) return 0;
    return diff;
  },
});

Transactions.attachVariantSchema(Bills.extensionSchema, { selector: { category: 'bill' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'bill' }).i18n('schemaTransactions');
  Transactions.simpleSchema({ category: 'bill' }).i18n('schemaBills');
});

// --- Factory ---

Factory.define('bill', Transactions, {
  category: 'bill',
  relation: 'supplier',
  partnerId: () => Factory.get('supplier'),
  issueDate: () => Clock.currentDate(),
  deliveryDate: () => Clock.currentDate(),
  dueDate: () => Clock.currentDate(),
  lines: () => [{
    title: faker.random.word(),
    uom: 'piece',
    quantity: 1,
    unitPrice: faker.random.number(10000),
    account: '85',
    localizer: '@',
  }],
});

export const chooseBill = {
  options() {
    const communityId = Session.get('activeCommunityId');
    const bills = Transactions.find({ communityId, category: 'bill', outstanding: { $gt: 0 } });
    const options = bills.map(function option(bill) {
      return { label: `${bill.serialId} ${bill.partner()} ${moment(bill.valueDate).format('L')} ${bill.outstanding}`, value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};
