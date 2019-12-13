import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';

export const Payments = {};

Payments.extensionSchema = new SimpleSchema([Transactions.partnerSchema, {
  payAccount: { type: String, optional: true, autoform: chooseSubAccount('COA', '38') },  // the money account paid to/from
  // Connect either a bill or a contra account
  billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  // contraAccount: { type: String, optional: true, autoform: chooseSubAccount('COA', '') },  // the contra account if no bill is connected
}]);

Transactions.categoryHelpers('payment', {
  lineCount() {
    if (this.billId) return 0;
    return Transactions.findOne(this.billId).lineCount();
  },
  post(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = TxCats.findOne({ communityId, category: 'payment', 'data.relation': this.relation });
    const bill = Transactions.findOne(this.billId);
    const ratio = this.amount / bill.amount;
    function copyLinesInto(txSide) {
      bill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        txSide.push({ amount: line.amount * ratio, account: line.account, localizer: line.localizer });
      });
    }
    if (accountingMethod === 'accrual') {
      if (bill.relation === 'supplier') {
        this.debit = [{ account: '46' }];
        this.credit = [{ account: this.payAccount }];
      } else if (bill.relation === 'customer') {
        this.debit = [{ account: this.payAccount }];
        this.credit = [{ account: '31' }];
      } else if (bill.relation === 'parcel') {
        this.debit = [{ account: this.payAccount }];
        this.credit = [{ account: '33'+'' }];
      } else debugAssert(false, 'No such bill relation');
    } else if (accountingMethod === 'cash') {
      if (bill.relation === 'supplier') {
        this.debit = []; copyLinesInto(this.debit);
        this.credit = [{ account: '46' }];
      } else if (bill.relation === 'customer') {
        this.debit = [{ account: '31' }];
        this.credit = []; copyLinesInto(this.credit);
      } else if (bill.relation === 'parcel') {
        this.debit = [{ account: '33'+'' }];  // line.account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.payinType;
        this.credit = []; copyLinesInto(this.credit);
      } else debugAssert(false, 'No such bill relation');
    }
    return { debit: this.debit, credit: this.credit };
  },
  registerOnBill() {
    debugAssert(this.billId, 'Cannot process a payment without connecting it to a bill first');
    const bill = Transactions.findOne(this.billId);
    return Transactions.update(this.billId,
      { $set: { amount: bill.amount /* triggers outstanding calc */, payments: bill.payments.concat([this._id]) } },
      { selector: { category: 'bill' } },
    );
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.billId, 'Cannot process a payment without connecting it to a bill first');
    debugAssert(this.partnerId, 'Cannot process a payment without a partner');
    const bill = Transactions.findOne(this.billId);
    Partners.relCollection(this.relation).update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    if (this.relation === 'parcel') {
      bill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        debugAssert(line.localizer, 'Cannot process a parcel payment without bill localizer fields');
        const ref = Localizer.code2parcelRef(line.localizer);
        Parcels.update({ communityId: this.communityId, ref }, { $inc: { outstanding: (-1) * sign * line.amount } });
      });
    }
  },
});

Transactions.attachVariantSchema(Payments.extensionSchema, { selector: { category: 'payment' } });

Meteor.startup(function attach() {
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
  payAccount: '85',
});
