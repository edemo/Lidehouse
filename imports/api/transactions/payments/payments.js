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
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { equalWithinRounding } from '/imports/api/utils.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { LocationTagsSchema } from '/imports/api/transactions/account-specification.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { chooseConteerAccount } from '/imports/api/transactions/txdefs/txdefs.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';

Math.smallerInAbs = function smallerInAbs(a, b) {
  if (a >= 0 && b >= 0) return Math.min(a, b);
  else if (a <= 0 && b <= 0) return Math.max(a, b);
  debugAssert(false); return undefined;
};

Array.oppositeSignsFirst = function oppositeSignsFirst(inputArray, number, key) {
  const negatives = [];
  const positives = [];
  inputArray.forEach(elem => {
    if (elem < 0 || elem[key] < 0) negatives.push(elem);
    else positives.push(elem);
  });
  if (number >= 0) return negatives.concat(positives);
  else return positives.concat(negatives);
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
/*  To dynamically select localizer, when changing the partner on the payment:
  value() {
    const contractId = AutoForm.getFieldValue('contractId');
    const contract = contractId && Contracts.findOne(contractId);
    return contract?.accounting?.localizer;
  },
*/
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
Payments.lineSchema = new SimpleSchema([lineSchema, LocationTagsSchema]);

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
    let billSum = 0;
    this.getBills().forEach(pb => {
      const bill = Transactions.findOne(pb.id);
      productionAssert(pb.amount < 0 === bill.amount < 0, 'err_notAllowed', 'Bill amount and its payment must have the same sign');
      let amountToPay = bill.outstanding;
      const savedPayment = _.find(bill.getPayments(), p => p.id === this._id);
      if (savedPayment) savedPayment > 0 ? amountToPay -= savedPayment.amount : amountToPay += savedPayment.amount;
      if ((amountToPay > 0 && pb.amount > amountToPay) || (amountToPay < 0 && pb.amount < amountToPay)) {
        throw new Meteor.Error('err_sanityCheckFailed', "Bill's payment amount cannot exceed bill's amount", `${pb.amount} - ${amountToPay}`);
      }
      billSum += pb.amount;
    });
    if ((this.amount > 0 && billSum > this.amount) || (this.amount < 0 && billSum < this.amount)) {
      throw new Meteor.Error('err_sanityCheckFailed', "Lines amounts cannot exceed payment's amount", `${billSum} - ${this.amount}`);
    }
    let lineSum = 0;
    const lineValues = [];
    this.getLines().forEach(line => {
      lineSum += line.amount;
      lineValues.push(line.amount);
    });
    productionAssert(lineValues.every((val) => val > 0) || lineValues.every((val) => val < 0), 'err_notAllowed', 'All lines must have the same sign');
    if (this.amount !== lineSum + billSum) {
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
      if (pb.amount > bill.outstanding) pb.amount = autoAmount;
      if (!pb.amount) pb.amount = autoAmount; // we dont override amounts that are specified
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
    this.debit = [];
    this.credit = [];
    let unallocatedAmount = this.amount;
    this.makeEntry(this.relationSide(), { amount: this.amount, account: this.payAccount });
    this.getBills().forEach(billPaid => {
      if (unallocatedAmount === 0) return false;
      const bill = Transactions.findOne(billPaid.id);
      if (!bill.isPosted()) throw new Meteor.Error('Bill has to be posted first');
      debugAssert(billPaid.amount < 0 === bill.amount < 0, 'Bill amount and its payment must have the same sign');
      const makeEntries = function makeEntries(line, amount) {
        let relationAccount = line.relationAccount || this.relationAccount().code;
        if (!line.relationAccount && line.billing) relationAccount += ParcelBillings.findOne(line.billing.id).digit;
        const newEntry = { amount, localizer: line.localizer, parcelId: line.parcelId, contractId: bill.contractId };
        this.makeEntry(this.conteerSide(), _.extend({ account: relationAccount }, newEntry));
        if (accountingMethod === 'cash') {
          const technicalAccount = Accounts.toTechnical(line.account);
          this.makeEntry(this.relationSide(), _.extend({ account: technicalAccount }, newEntry));
          this.makeEntry(this.conteerSide(), _.extend({ account: line.account }, newEntry));
        }
      };

      if (billPaid.amount === bill.amount) {
        bill.getLines().forEach((line) => {
          if (unallocatedAmount === 0) return false;
          const amount = line.amount;
          makeEntries.call(this, line, amount);
          unallocatedAmount -= amount;
        });
      } else if (Math.abs(billPaid.amount) < Math.abs(bill.amount)) {
        let paidBefore = 0;
        bill.payments?.forEach(payment => {
          if (payment.id !== this._id) paidBefore += payment.amount;
        });
        let unallocatedFromBill = billPaid.amount;
        const billLines = Array.oppositeSignsFirst(bill.getLines(), bill.amount, 'amount');
        billLines.forEach(line => {
          if (unallocatedAmount === 0) return false;
          if (paidBefore === 0) {
            let amount;
            if (bill.amount >= 0) amount = line.amount >= 0 ? Math.min(line.amount, unallocatedAmount, unallocatedFromBill) : line.amount;
            if (bill.amount < 0) amount = line.amount < 0 ? Math.max(line.amount, unallocatedAmount, unallocatedFromBill) : line.amount;
            makeEntries.call(this, line, amount);
            unallocatedAmount -= amount;
            unallocatedFromBill -= amount;
          } else if ((bill.amount >= 0 && paidBefore > 0) || (bill.amount < 0 && paidBefore < 0)) {
            paidBefore -= line.amount;
          }
          if ((bill.amount >= 0 && paidBefore < 0) || (bill.amount < 0 && paidBefore > 0)) {
            const remainder = -paidBefore;
            paidBefore = 0;
            let amount;
            if (bill.amount >= 0) amount = Math.min(remainder, unallocatedAmount, unallocatedFromBill);
            if (bill.amount < 0) amount = Math.max(remainder, unallocatedAmount, unallocatedFromBill);
            makeEntries.call(this, line, amount);
            unallocatedAmount -= amount;
            unallocatedFromBill -= amount;
          }
        });
      }
      debugAssert(Math.abs(billPaid.amount) <= Math.abs(bill.amount), "payed amount for a bill can not be more than bill's amount");
    });
    this.getLines().forEach(line => {
      if (unallocatedAmount === 0) return false;
      debugAssert(unallocatedAmount < 0 === line.amount < 0, 'All lines must have the same sign');
      const amount = Math.smallerInAbs(line.amount, unallocatedAmount);
      this.makeEntry(this.conteerSide(), { amount, account: line.account, localizer: line.localizer, parcelId: line.parcelId, contractId: line.contractId });
      unallocatedAmount -= amount;
    });
    // Handling the remainder
    if (unallocatedAmount) { // still has remainder
      if (equalWithinRounding(unallocatedAmount, 0)) {
        this[this.conteerSide()].push({ amount: unallocatedAmount, account: '`99' });
      } else throw new Meteor.Error('err_notAllowed', 'Payment accounting can only be done, when all amount is allocated');
    }
    const legs = { debit: this.debit, credit: this.credit };
    return legs;
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
/*
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.partnerId, 'Cannot process a payment without a partner');
    Partners.update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    this.getBills().forEach(bp => {
      const bill = Transactions.findOne(bp.id);
      Contracts.update(bill.contractId, { $inc: { outstanding: (-1) * sign * bp.amount } }, { selector: { relation: 'member' } });
      bill.getLines().forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        const parcel = Localizer.parcelFromCode(line.localizer, this.communityId);
        if (parcel) {
          Parcels.update(parcel._id, { $inc: { outstanding: (-1) * sign * line.amount } }, { selector: { category: '@property' } });
        } else debugAssert(this.relation !== 'member', 'Cannot process a parcel payment without parcelId field');
      });
    });
    this.getLines().forEach(line => {
      if (!line) return; // can be null, when a line is deleted from the array
      Contracts.update(line.contractId, { $inc: { outstanding: (-1) * sign * line.amount } }, { selector: { relation: 'member' } });
      const parcel = Localizer.parcelFromCode(line.localizer, this.communityId);
      if (parcel) {
        Parcels.update(parcel._id, { $inc: { outstanding: (-1) * sign * line.amount } }, { selector: { category: '@property' } });
      } 
    });
  },*/
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
//  partnerId: () => Factory.get('supplier'),
//  contractId: () => Factory.get('contract'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
  payAccount: '`381',
});
