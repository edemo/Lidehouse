import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
//  import { TxDefs } from '/imports/api/transactions/tx-defs.js';
import { insert as insertTx } from '/imports/api/transactions/methods.js';

export const BILLING_DAY_OF_THE_MONTH = 10;
export const BILLING_MONTH_OF_THE_YEAR = 3;

export const apply = new ValidatedMethod({
  name: 'parcelBillings.apply',
  validate: new SimpleSchema({
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ id }) {
    const parcelBilling = ParcelBillings.findOne(id);
    const parcels = parcelBilling.parcels();
    let totalAmount = 0;
    const debitLegs = [];
    parcels.forEach((parcel) => {
      let amount;
      switch (parcelBilling.projection) {
        case 'absolute':
          amount = parcelBilling.amount;
          break;
        case 'perArea':
          amount = parcelBilling.amount * (parcel.area || 0);
          break;
        case 'perVolume':
          amount = parcelBilling.amount * (parcel.volume || 0);
          break;
        case 'perHabitant':
          amount = parcelBilling.amount * (parcel.habitants || 0);
          break;
        default: debugAssert(false);
      }
      // Not dealing with fractions of a dollar or forint
      amount = Math.round(amount);

      totalAmount += amount;
      debitLegs.push({
        amount,
        account: Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.payinType,
        localizer: Localizer.parcelRef2code(parcel.ref),
      });
    });

    const tx = {
      communityId: parcelBilling.communityId,
      valueDate: parcelBilling.valueDate,
      amount: totalAmount,
//        defId: TxDefs.findOne({ communityId: parcelBilling.communityId, name: 'Obligation' }),
      credit: [{
        account: Breakdowns.name2code('Incomes', 'Owner payins', parcelBilling.communityId) + parcelBilling.payinType,
      }],
      debit: debitLegs,
      note: parcelBilling.note,
    };
    const result = insertTx._execute({ userId: this.userId }, tx);
    return result;
  },
});

export const insert = new ValidatedMethod({
  name: 'parcelBillings.insert',
  validate: ParcelBillings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'transactions.insert', doc.communityId);
    const id = ParcelBillings.insert(doc);
    if (Meteor.isServer) {
      // new parcel billings are automatically applied
      apply._execute({ userId: this.userId }, { id });
    }
    return id;
  },
});
