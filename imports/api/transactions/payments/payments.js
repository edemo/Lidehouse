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
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

export const Payments = {};

export const chooseBillOfPartner = {
  options() {
    const communityId = ModalStack.getVar('communityId');
    const relation = AutoForm.getFieldValue('relation');
    const partnerId = AutoForm.getFieldValue('partnerId');
//    const amount = AutoForm.getFieldValue('amount');
//    const bills = Transactions.find({ communityId, category: 'bill', relation, outstanding: { $gt: 0, $lte: amount } });
//    const billByProximity = _.sortBy(bills.fetch(), b => (b.oustanding - amount));
    const bills = Transactions.find({ communityId, category: 'bill', relation, partnerId }, { sort: { createdAt: -1 } });
    const options = bills.map(function option(bill) {
      return { label: `${bill.serialId} ${bill.partner()} ${moment(bill.valueDate).format('L')} ${bill.outstanding}/${bill.amount}`, value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

const billPaidSchema = {
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseBillOfPartner },
  amount: { type: Number, decimal: true },
};
_.each(billPaidSchema, val => val.autoform = _.extend({}, val.autoform, { afFormGroup: { label: false } }));
Payments.billPaidSchema = new SimpleSchema(billPaidSchema);

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
    outstanding: { type: Number, decimal: true, min: 0, optional: true },
  },
]);

Transactions.categoryHelpers('payment', {
  getBills() {
    return (this.bills || []);
  },
  getBillTransactions() {
    return this.getBills().map(bill => Transactions.findOne(bill.id));
  },
  billCount() {
    return this.getBills().length;
  },
  calculateOutstanding() {
    let allocated = 0;
    this.getBills().forEach(bill => allocated += bill.amount);
    return this.amount - allocated;
  },
  allocated() {
    return this.amount - this.outstanding;
  },
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'payment', 'data.relation': this.relation });
    this.debit = [];
    this.credit = [];
    let unallocatedAmount = this.amount;
    this[this.relationSide()].push({ amount: this.amount, account: this.payAccount });
    this.bills.forEach(billPaid => {
      const bill = Transactions.findOne(billPaid.id);
      if (accountingMethod === 'accrual') {
        bill[this.relationSide()].forEach(entry => {
          const amount = equalWithinRounding(entry.amount, unallocatedAmount) ? entry.amount : Math.min(entry.amount, unallocatedAmount);
          this[this.conteerSide()].push({ amount, account: entry.account, localizer: entry.localizer, parcelId: entry.parcelId });
          unallocatedAmount -= amount;
          if (unallocatedAmount <= 0) return;
        });
      } else if (accountingMethod === 'cash') {
        bill.lines.forEach(line => {
          if (!line) return; // can be null, when a line is deleted from the array
          const amount = Math.min(line.amount, unallocatedAmount);
          this[this.conteerSide()].push({ amount, account: line.account, localizer: line.localizer, parcelId: line.parcelId });
          unallocatedAmount -= amount;
          if (unallocatedAmount <= 0) return;
        });
      }
    });
    // Handling the remainder
    if (unallocatedAmount) { // still has remainder
      if (equalWithinRounding(unallocatedAmount, 0)) {
        this[this.conteerSide()].push({ amount: unallocatedAmount, account: '`99' });
      } else {
        this[this.conteerSide()].push({ amount: unallocatedAmount, account: this.txdef()[this.conteerSide()][0] });
      }
    }
    return { debit: this.debit, credit: this.credit };
  },
  registerOnBill() {
    const result = [];
    this.bills.forEach(billPaid => {
      const bill = Transactions.findOne(billPaid.id);
      const pb = _.extend({}, billPaid);
      pb.id = this._id; // replacing the bill._id with the payment._id
      result.push(Transactions.update(bill._id,
        { $set: { payments: bill.getPayments().concat([pb]) } },
        { selector: { category: 'bill' } },
      ));
    });
    return result;
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.partnerId, 'Cannot process a payment without a partner');
    Partners.update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    Memberships.update(this.membershipId, { $inc: { outstanding: (-1) * sign * this.amount } });
    if (this.relation === 'member') {
      this.bills.forEach(bp => {
        const bill = Transactions.findOne(bp.id);
          bill.lines.forEach(line => {
            if (!line) return; // can be null, when a line is deleted from the array
            debugAssert(line.parcelId, 'Cannot process a parcel payment without parcelId field');
            Parcels.update(line.parcelId, { $inc: { outstanding: (-1) * sign * line.amount } });
          });
      });
    }
  },
  displayInHistory() {
    return __(this.category) + (this.bills ? ` (${this.bills.length} ${__('item')})` : '');
  },
});

Transactions.attachVariantSchema(paymentSchema, { selector: { category: 'payment' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'payment' }).i18n('schemaTransactions');
  Transactions.simpleSchema({ category: 'payment' }).i18n('schemaPayments');
});

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
