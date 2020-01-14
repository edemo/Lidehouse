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

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Payments = {};

export const chooseBill = {
  options() {
    const communityId = Session.get('activeCommunityId');
    const bills = Transactions.find({ communityId, category: 'bill', outstanding: { $gt: 0 } });
    const options = bills.map(function option(bill) {
      return { label: `${bill.serialId()} ${bill.partner()} ${moment(bill.valueDate).format('L')} ${bill.outstanding}`, value: bill._id };
    });
    return options;
  },
  firstOption: () => __('(Select one)'),
};

Payments.billSchema = new SimpleSchema({
  id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: chooseBill },
  amount: { type: Number, decimal: true },
});

const paymentSchema = new SimpleSchema([Transactions.partnerSchema, {
  payAccount: { type: String, optional: true, autoform: chooseSubAccount('COA', '38') },  // the money account paid to/from
  bills: { type: [Payments.billSchema], defaultValue: [] },
  outstanding: { type: Number, decimal: true, optional: true, autoform: { omit: true } }, // cached value
}]);

Transactions.categoryHelpers('payment', {
  billCount() {
    return this.bills.length;
  },
  makeJournalEntries(accountingMethod) {
//    const communityId = this.communityId;
//    const cat = Txdefs.findOne({ communityId, category: 'payment', 'data.relation': this.relation });
    this.debit = [];
    this.credit = [];
    this.bills.forEach(pb => {
      const bill = Transactions.findOne(pb.id);
      const ratio = pb.amount / bill.amount;
      if (accountingMethod === 'accrual') {
        bill[this.relationSide()].forEach(entry => {
          const partialAmount = Math.round(entry.amount * ratio);
          this[this.conteerSide()].push({ amount: partialAmount, account: entry.account, localizer: entry.localizer });
          this[this.relationSide()].push({ amount: partialAmount, account: this.payAccount, localizer: entry.localizer });
        });
      } else if (accountingMethod === 'cash') {
        bill.lines.forEach(line => {
          if (!line) return; // can be null, when a line is deleted from the array
          const partialAmount = Math.round(line.amount * ratio);
          this[this.conteerSide()].push({ amount: partialAmount, account: line.account, localizer: line.localizer });
          this[this.relationSide()].push({ amount: partialAmount, account: this.payAccount, localizer: line.localizer });
        });
      }
    });
    return { debit: this.debit, credit: this.credit };
  },
  registerOnBill() {
    const result = [];
    this.bills.forEach(bp => {
      const bill = Transactions.findOne(bp.id);
      const pb = _.extend({}, bp);
      pb.id = this._id; // replacing the bill._id with the payment._id
      result.push(Transactions.update(bill._id,
        { $set: { amount: bill.amount /* triggers outstanding calc */, payments: bill.payments.concat([pb]) } },
        { selector: { category: 'bill' } },
      ));
    });
    return result;
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.partnerId, 'Cannot process a payment without a partner');
    Partners.update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    if (this.relation === 'parcel') {
      this.bills.forEach(bp => {
        const bill = Transactions.findOne(bp.id);
          bill.lines.forEach(line => {
            if (!line) return; // can be null, when a line is deleted from the array
            debugAssert(line.localizer, 'Cannot process a parcel payment without bill localizer fields');
            const ref = Localizer.code2parcelRef(line.localizer);
            Parcels.update({ communityId: this.communityId, ref }, { $inc: { outstanding: (-1) * sign * line.amount } });
          });
      });
    }
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
  payAccount: '85',
});
