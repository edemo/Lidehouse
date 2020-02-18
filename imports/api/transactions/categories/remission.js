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
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';
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
      this[bill.conteerSide()] = [{ account: bill.relationAccount().code }];
      this[bill.relationSide()] = [{ account: this.payAccount }];
    } else if (accountingMethod === 'cash') {
      this[bill.conteerSide()] = []; copyLinesInto(this.bill.conteerSide());
      this[bill.relationSide()] = [{ account: this.payAccount }];
    }
    return { debit: this.debit, credit: this.credit };
  },
  registerOnBill() {
    const result = [];
    this.bills.forEach(bp => {
      const bill = Transactions.findOne(bp.id);
      const pb = _.extend({}, bp);
      pb.id = this._id; // replacing the bill._id with the payment._id
      result.push(Transactions.update(bill._id,
        { $set: { amount: bill.amount /* triggers outstanding calc */, payments: bill.getPayments().concat([pb]) } },
        { selector: { category: 'bill' } },
      ));
    });
    return result;
  },
  updateOutstandings(sign) {
    if (Meteor.isClient) return;
    debugAssert(this.partnerId, 'Cannot process a payment without a partner');
    Partners.update(this.partnerId, { $inc: { outstanding: (-1) * sign * this.amount } });
    if (this.relation === 'member') {
      this.bills.forEach(bp => {
        const bill = Transactions.findOne(bp.id);
          bill.lines.forEach(line => {
            if (!line) return; // can be null, when a line is deleted from the array
            debugAssert(line.parcelId, 'Cannot process a parcel remission without parcelId field');
            Parcels.update(line.parcelId, { $inc: { outstanding: (-1) * sign * line.amount } });
          });
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
