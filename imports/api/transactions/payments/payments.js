import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { equalWithinRounding } from '/imports/api/utils.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

Math.smallerInAbs = function smallerInAbs(a, b) {
  if (a >= 0 && b >= 0) return Math.min(a, b);
  else if (a <= 0 && b <= 0) return Math.max(a, b);
  debugAssert(false); return undefined;
};

export const Payments = {};

export const chooseBillOfPartner = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation');
    const partnerId = AutoForm.getFieldValue('partnerId');
//    const amount = AutoForm.getFieldValue('amount');
//    const bills = Transactions.find({ communityId, category: 'bill', relation, outstanding: { $gt: 0, $lte: amount } });
//    const billByProximity = _.sortBy(bills.fetch(), b => (b.oustanding - amount));
    const selector = { communityId, category: 'bill', relation, partnerId };
    const bills = Transactions.find(Object.cleanUndefined(selector), { sort: { createdAt: -1 } });
    const options = bills.map(function option(bill) {
      return { label: bill.displayInSelect(), value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

export const chooseParcelOfPartner = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const partnerId = AutoForm.getFieldValue('partnerId');
    const parcels = Memberships.find({ communityId, partnerId }).map(m => m.parcel());
    const options = _.without(parcels, undefined).map(p => ({ label: p.displayAccount(), value: p.code }));
    return options;
  },
  firstOption: false,
};

const billPaidSchema = {
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseBillOfPartner },
  amount: { type: Number, decimal: true, autoform: { defaultValue: 0 } },
};
_.each(billPaidSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Payments.billPaidSchema = new SimpleSchema(billPaidSchema);

const lineSchema = {
  account: { type: String /* account code */, autoform: chooseConteerAccount(), optional: true },
  localizer: { type: String /* account code */, autoform: chooseParcelOfPartner, optional: true },
  amount: { type: Number, decimal: true, autoform: { defaultValue: 0 } },
};
_.each(lineSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Payments.lineSchema = new SimpleSchema(lineSchema);

const extensionSchema = {
  valueDate: { type: Date }, // same as Tx, but we need the readonly added
  amount: { type: Number, decimal: true }, // same as Tx, but we need the readonly added
  payAccount: { type: String, optional: true, autoform: chooseConteerAccount(true) },
  remission: { type: Boolean, optional: true },
};
_.each(extensionSchema, val => val.autoform = _.extend({}, val.autoform, { readonly() { return !!ModalStack.getVar('statementEntry'); } }));
Payments.extensionSchema = new SimpleSchema(extensionSchema);

const paymentSchema = new SimpleSchema([
  Transactions.partnerSchema,
  Payments.extensionSchema, {
    bills: { type: [Payments.billPaidSchema], defaultValue: [] },
    lines: { type: [Payments.lineSchema], defaultValue: [] },
    outstanding: { type: Number, decimal: true, min: 0, optional: true },
  },
]);

Transactions.categoryHelpers('payment', {
  getBills() {
    return (this.bills || []);
  },
  getLines() {
    return (this.lines || []);
  },
  getBillTransactions() {
    return this.getBills().map(bill => Transactions.findOne(bill.id));
  },
  billCount() {
    return this.getBills().length;
  },
  calculateOutstanding() {
    return this.amount - this.allocatedToBills();
  },
  allocatedToBills() {
    let allocated = 0;
    this.getBills().forEach(bill => allocated += bill.amount);
    return allocated;
  },
  allocatedToNonBills() {
    let allocated = 0;
    this.getLines().forEach(line => allocated += line.amount);
    return allocated;
  },
  allocatedSomewhere() {
    return this.allocatedToBills() + this.allocatedToNonBills();
  },
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'payment', 'data.relation': this.relation });
    this.debit = [];
    this.credit = [];
    let unallocatedAmount = this.amount;
    this[this.relationSide()].push({ amount: this.amount, account: this.payAccount });
    this.bills.forEach(billPaid => {
      if (unallocatedAmount === 0) return false;
      const bill = Transactions.findOne(billPaid.id);
      if (!bill.isPosted()) throw new Meteor.Error('Bill has to be posted first');
      if (accountingMethod === 'accrual') {
        bill[this.relationSide()].forEach(entry => {
          if (unallocatedAmount === 0) return false;
          const amount = equalWithinRounding(entry.amount, billPaid.amount) ? entry.amount : Math.smallerInAbs(entry.amount, billPaid.amount);
          this[this.conteerSide()].push({ amount, account: entry.account, localizer: entry.localizer, parcelId: entry.parcelId });
          unallocatedAmount -= amount;
        });
      } else if (accountingMethod === 'cash') {
        bill.lines.forEach(line => {
          if (unallocatedAmount === 0) return false;
          if (!line) return true; // can be null, when a line is deleted from the array
          const amount = Math.smallerInAbs(line.amount, billPaid.amount);
          const parcelId = line.localizer && Parcels.findOne({ communityId: this.communityId, code: line.localizer })._id;
          this[this.conteerSide()].push({ amount, account: line.account, localizer: line.localizer, parcelId });
          unallocatedAmount -= amount;
        });
      }
    });
    this.lines.forEach(line => {
      if (unallocatedAmount === 0) return false;
      if (!line) return true; // can be null, when a line is deleted from the array
      const amount = Math.smallerInAbs(line.amount, unallocatedAmount);
      this[this.conteerSide()].push({ amount, account: line.account, localizer: line.localizer, parcelId: line.parcelId });
      unallocatedAmount -= amount;
    });
    // Handling the remainder
    if (unallocatedAmount) { // still has remainder
      if (equalWithinRounding(unallocatedAmount, 0)) {
        this[this.conteerSide()].push({ amount: unallocatedAmount, account: '`99' });
      } else throw new Meteor.Error('err_notAllowed', 'Payment accounting can only be done, when all amount is allocated');
    }
    return { debit: this.debit, credit: this.credit };
  },
  registerOnBills(direction = +1) {
    const result = [];
    this.bills.forEach(billPaid => {
      const bill = Transactions.findOne(billPaid.id);
      const paymentOnBill = _.extend({}, billPaid);
      paymentOnBill.id = this._id; // replacing the bill._id with the payment._id
      const oldPayments = bill.getPayments();
      const found = _.find(oldPayments, p => p.id === this._id);
      let newPayments;
      if (direction > 0) {
        if (found) {
          found.amount = paymentOnBill.amount;
          newPayments = oldPayments;
        } else newPayments = oldPayments.concat([paymentOnBill]);
      } else {
        if (found) found.amount = 0;
        newPayments = oldPayments;
      }
      result.push(Transactions.update(bill._id,
        { $set: { payments: newPayments } },
        { selector: { category: 'bill' } },
      ));
    });
    return result;
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.partnerId, 'Cannot process a payment without a partner');
    Partners.update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    Contracts.update(this.contractId, { $inc: { outstanding: (-1) * sign * this.amount } }, { selector: { relation: 'member' } });
    if (this.relation === 'member') {
      this.bills.forEach(bp => {
        const bill = Transactions.findOne(bp.id);
        bill.lines.forEach(line => {
          if (!line) return; // can be null, when a line is deleted from the array
          debugAssert(line.parcelId, 'Cannot process a parcel payment without parcelId field');
          Parcels.update(line.parcelId, { $inc: { outstanding: (-1) * sign * line.amount } }, { selector: { category: '@property' } });
        });
      });
    }
  },
  displayInHistory() {
    return __(this.category) + (this.bills ? ` (${this.bills.length} ${__('item')})` : '');
  },
  displayInSelect() {
    return `${this.serialId} (${moment(this.valueDate).format('YYYY.MM.DD')} ${this.partner()} ${this.amount})`;
  },
});

Transactions.attachVariantSchema(paymentSchema, { selector: { category: 'payment' } });

Transactions.simpleSchema({ category: 'payment' }).i18n('schemaTransactions');
Transactions.simpleSchema({ category: 'payment' }).i18n('schemaPayments');

// --- Factory ---

Factory.define('payment', Transactions, {
  category: 'payment',
//  billId: () => Factory.get('bill'),
  relation: 'supplier',
  partnerId: () => Factory.get('supplier'),
  contractId: () => Factory.get('contract'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
  payAccount: '`381',
});
