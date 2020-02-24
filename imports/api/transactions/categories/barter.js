import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { chooseBill } from '/imports/api/transactions/bills/bills.js';

const barterSchema = new SimpleSchema({
//  supplier: { type: Transactions.partnerSchema },
//  customer: { type: Transactions.partnerSchema },
  customerBillId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseBill },
  supplierBillId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseBill },
});

Transactions.categoryHelpers('barter', {
  supplierBill() {
    return Transactions.findOne(this.supplierBillId);
  },
  customerBill() {
    return Transactions.findOne(this.customerBillId);
  },
  makeJournalEntries(accountingMethod) {
    const supplierBill = Transactions.findOne(this.supplierBillId);
    const customerBill = Transactions.findOne(this.customerBillId);
    function copyLinesInto(txSide, bill) {
      const ratio = bill.amount / this.amount;
      bill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        txSide.push({ amount: line.amount * ratio, account: line.account, localizer: line.localizer });
      });
    }
    // TODO: this does not work for parcel bills, needs payin digit
    if (accountingMethod === 'accrual') {
      this.debit = [{ account: supplierBill.relationAccount().code }];
      this.credit = [{ account: customerBill.relationAccount().code }];
    } else if (accountingMethod === 'cash') {
      copyLinesInto(this.debit, supplierBill);
      copyLinesInto(this.credit, customerBill);
    }
  },
  registerOnBill() {
    debugAssert(this.supplierBillId && this.customerBillId, 'Cannot process a barter without connecting it to a bills first');
    const supplierBill = Transactions.findOne(this.supplierBillId);
    const supplierRes = Transactions.update(this.supplierBill,
      { $set: { amount: supplierBill.amount /* triggers outstanding calc */, payments: supplierBill.getPayments().concat([this._id]) } },
      { selector: { category: 'bill' } },
    );
    const customerBill = Transactions.findOne(this.customerBillId);
    const customerRes = Transactions.update(this.customerBill,
      { $set: { amount: customerBill.amount /* triggers outstanding calc */, payments: customerBill.getPayments().concat([this._id]) } },
      { selector: { category: 'bill' } },
    );
    return supplierRes + customerRes;
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.supplierBillId && this.customerBillId, 'Cannot process a barter without connecting it to a bills first');
    const supplierBill = this.supplierBill();
    const customerBill = this.customerBill();
    debugAssert(supplierBill.partnerId && customerBill.partnerId, 'Cannot process a barter without partners');
    Partners.update(supplierBill.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    Partners.update(customerBill.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    if (customerBill.relation === 'member') {
      customerBill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        debugAssert(line.parcelId, 'Cannot process a parcel barter without parcelId field');
        Parcels.update(line.parcelId, { $inc: { outstanding: (-1) * sign * line.amount } });
      });
    }
  },
});

Transactions.attachVariantSchema(barterSchema, { selector: { category: 'barter' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'barter' }).i18n('schemaTransactions');
});

// --- Factory ---

Factory.define('barter', Transactions, {
  category: 'barter',
  supllier: () => Factory.get('supplier'),
  customer: () => Factory.get('customer'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
