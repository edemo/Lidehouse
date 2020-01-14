import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Breakdowns, chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';
import { chooseBill } from '/imports/api/transactions/bills/bills.js';
import { Payments } from '/imports/api/transactions/payments/payments.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

const remissionSchema = new SimpleSchema([Transactions.partnerSchema, {
  bills: { type: [Payments.billSchema], defaultValue: [] },
  outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } }, // cached value
}]);

Transactions.categoryHelpers('remission', {
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'payment', 'data.relation': this.relation });
    const bill = Transactions.findOne(this.billId);
    const ratio = this.amount / bill.amount;
    function copyLinesInto(txSide) {
      bill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        txSide.push({ amount: line.amount * ratio, account: line.account, localizer: line.localizer });
      });
    }
    if (accountingMethod === 'accrual') {
      this[bill.conteerSide()] = [{ account: bill.relationAccount() }];
      this[bill.relationSide()] = [{ account: this.payAccount }];
    } else if (accountingMethod === 'cash') {
      this[bill.conteerSide()] = []; copyLinesInto(this.bill.conteerSide());
      this[bill.relationSide()] = [{ account: this.payAccount }];
    }
    return { debit: this.debit, credit: this.credit };
  },
  registerOnBill() {
    debugAssert(this.billId, 'Cannot process a remission without connecting it to a bill first');
    const bill = Transactions.findOne(this.billId);
    return Transactions.update(this.billId,
      { $set: { amount: bill.amount /* triggers outstanding calc */, payments: bill.payments.concat([this._id]) } },
      { selector: { category: 'bill' } },
    );
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.billId, 'Cannot process a remission without connecting it to a bill first');
    debugAssert(this.partnerId, 'Cannot process a remission without a partner');
    const bill = Transactions.findOne(this.billId);
    Partners.update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    if (this.relation === 'parcel') {
      bill.lines.forEach(line => {
        if (!line) return; // can be null, when a line is deleted from the array
        debugAssert(line.localizer, 'Cannot process a parcel remission without bill localizer fields');
        const ref = Localizer.code2parcelRef(line.localizer);
        Parcels.update({ communityId: this.communityId, ref }, { $inc: { outstanding: (-1) * sign * line.amount } });
      });
    }
  },
});

Transactions.attachVariantSchema(remissionSchema, { selector: { category: 'remission' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'remission' }).i18n('schemaTransactions');
});


// --- Factory ---

Factory.define('remission', Transactions, {
  category: 'remission',
//  billId: () => Factory.get('bill'),
  relation: 'supplier',
  partnerId: () => Factory.get('supplier'),
  contractId: () => Factory.get('contract'),
  valueDate: Clock.currentDate(),
  amount: () => faker.random.number(1000),
});
