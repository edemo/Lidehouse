import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { chooseBill } from '/imports/api/accounting/bills/bills.js';

// DEPRECATED
// We use bills and payments to do a barter, through a virtual barter payAccount

const barterSchema = new SimpleSchema({
//  supplier: { type: Transactions.partnerSchema },
//  customer: { type: Transactions.partnerSchema },
  customerBillId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseBill } },
  supplierBillId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...chooseBill } },
});

Transactions.categoryHelpers('barter', {
  supplierBill() {
    return Transactions.findOne(this.supplierBillId);
  },
  customerBill() {
    return Transactions.findOne(this.customerBillId);
  },
  makeJournalEntries(accountingMethod = this.community().settings.accountingMethod) {
    const supplierBill = Transactions.findOne(this.supplierBillId);
    const customerBill = Transactions.findOne(this.customerBillId);
    function copyLinesInto(txSide, bill) {
      // deprecated, bill lines are not accounted by ratio
      const ratio = bill.amount / this.amount;
      bill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        txSide.push({ amount: line.amount * ratio, account: line.account, localizer: line.localizer });
      });
    }
    // TODO: this does not work for parcel bills, needs payin digit
    if (accountingMethod === 'accrual') {
      this.debit = [{ account: supplierBill.relationAccount, amount: this.amount }];
      this.credit = [{ account: customerBill.relationAccount, amount: this.amount }];
    } else if (accountingMethod === 'cash') {
      copyLinesInto(this.debit, supplierBill);
      copyLinesInto(this.credit, customerBill);
    }
  },
  registerOnBills() {
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
  validate() {
    const supplierBill = this.supplierBill();
    const customerBill = this.customerBill();
//      if (!supplierBill.hasConteerData() || !customerBill.hasConteerData()) throw new Meteor.Error('Bill has to be account assigned first');
    if (supplierBill.relation !== 'supplier') throw new Meteor.Error('err_notAllowed', 'Supplier bill is not from a supplier');
    if (customerBill.relation !== 'customer' && customerBill.relation !== 'member') throw new Meteor.Error('err_notAllowed', 'Customer bill is not from a customer/owner');
  },
  validateForPost() {
    this.supplierBill().validateForPost();
    this.customerBill().validateForPost();
  },
});

Transactions.attachVariantSchema(barterSchema, { selector: { category: 'barter' } });

Transactions.simpleSchema({ category: 'barter' }).i18n('schemaTransactions');

// --- Factory ---

Factory.define('barter', Transactions, {
  category: 'barter',
  supllier: () => Factory.get('supplier'),
  customer: () => Factory.get('customer'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
