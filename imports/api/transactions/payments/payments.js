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
    const onFormAllocatedBillIds = _.pluck(AutoForm.getFieldValue('bills'), 'id');
    const selector = { communityId, category: 'bill', relation, partnerId, status: { $ne: 'void' }, outstanding: { $gt: 0 }, _id: { $nin: onFormAllocatedBillIds } };
    const bills = Transactions.find(Object.cleanUndefined(selector), { sort: { createdAt: -1 } });
    const options = bills.map(function option(bill) {
      return { label: bill.displayInSelect(), value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

export const chooseLocalizerOfPartner = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation');
    const partnerId = AutoForm.getFieldValue('partnerId');
    let localizers;
    if (relation === 'member') {
      const selector = Object.cleanUndefined({ communityId, relation: 'member', partnerId, leadParcelId: { $exists: false } });
      const contracts = Contracts.find(selector);
      const parcels = contracts.map(m => m.parcel());
      localizers = parcels.length ? parcels : Parcels.find({ communityId, category: '@property' });
    } else {
      localizers = Parcels.find({ communityId });
    }
    const options = localizers.map(p => ({ label: p.displayAccount(), value: p.code }));
    const sortedOptions = _.sortBy(options, o => o.label.toLowerCase());
    return sortedOptions;
  },
  firstOption: () => __('Localizers'),
};

const billPaidSchema = {
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseBillOfPartner } },
  amount: { type: Number, decimal: true, autoform: { defaultValue: 0 } },
};
_.each(billPaidSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Payments.billPaidSchema = new SimpleSchema(billPaidSchema);

const lineSchema = {
  account: { type: String /* account code */, autoform: chooseConteerAccount(), optional: true },
  localizer: { type: String /* account code */, autoform: { ...chooseLocalizerOfPartner }, optional: true },
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
    bills: { type: [Payments.billPaidSchema], optional: true },
    lines: { type: [Payments.lineSchema], optional: true },
    outstanding: { type: Number, decimal: true, min: 0, optional: true },
  },
]);

Transactions.categoryHelpers('payment', {
  getBills() {
    return (this.bills || []).filter(b => b); // nulls can be in the array, on the UI, when lines are deleted
  },
  getLines() {
    return (this.lines || []).filter(l => l);
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
  unallocated() {
    return this.amount - this.allocatedSomewhere();
  },
  validate() {
    if (this.unallocated() !== 0) {
      // The min, max contraint on the schema does not work, because the hook runs after the schema check
      throw new Meteor.Error('err_notAllowed', 'Payment has to be fully allocated', `unallocated: ${this.unallocated()}`);
    }
    const connectedBillIds = _.pluck(this.getBills(), 'id');
    if (connectedBillIds.length !== _.uniq(connectedBillIds).length) {
      throw new Meteor.Error('err_notAllowed', 'Same bill may not be selected multiple times', `connectedBillIds: ${connectedBillIds}`);
    }
  },
  autoAllocate() {
    if (!this.amount) return;
    let amountToAllocate = this.amount;
    this.getBills().forEach(pb => {
      if (!pb?.id) return true; // can be null, when a line is deleted from the array
      const bill = Transactions.findOne(pb.id);
      const autoAmount = Math.min(amountToAllocate, bill.outstanding);
      if (pb.amount && pb.amount < autoAmount) { /* we dont override amounts that are specified */ }
      else pb.amount = autoAmount;
      amountToAllocate -= pb.amount;
      if (amountToAllocate === 0) return false;
    });
    this.getLines().forEach(line => {
      if (!line) return true; // can be null, when a line is deleted from the array
      if (line.amount && line.amount < amountToAllocate) {
        amountToAllocate -= line.amount;
        return true;
      } else {
        line.amount = amountToAllocate;
        amountToAllocate = 0;
        return false;
      }
    });
    if (amountToAllocate) {
      if (this.lines?.length) (_.last(this.lines)).amount += amountToAllocate;
      else this.lines = [{ amount: amountToAllocate }];
    }
  },
  fillFromStatementEntry(entry) {
    this.payAccount = entry.account;
  },
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'payment', 'data.relation': this.relation });
    this.debit = [];
    this.credit = [];
    let unallocatedAmount = this.amount;
    this[this.relationSide()].push({ amount: this.amount, account: this.payAccount });
    this.getBills().forEach(billPaid => {
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
        bill.getLines().forEach(line => {
          if (unallocatedAmount === 0) return false;
          if (!line) return true; // can be null, when a line is deleted from the array
          const amount = Math.smallerInAbs(line.amount, billPaid.amount);
          const parcelId = line.localizer && Parcels.findOne({ communityId: this.communityId, code: line.localizer })._id;
          this[this.conteerSide()].push({ amount, account: line.account, localizer: line.localizer, parcelId });
          unallocatedAmount -= amount;
        });
      }
    });
    this.getLines().forEach(line => {
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
    this.getBills().forEach(billPaid => {
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
      this.getBills().forEach(bp => {
        const bill = Transactions.findOne(bp.id);
        bill.getLines().forEach(line => {
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
