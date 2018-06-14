import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Payments } from '/imports/api/payments/payments.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

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

      let months;
      if (parcelBilling.month === 'allMonths')
        months = [1,2,3,4,5,6,7,8,9,10,11,12];
      else if (parcelBilling.month)
        months = [parseInt(parcelBilling.month)];
      else
        months = [BILLING_MONTH_OF_THE_YEAR];

      months.forEach((i) => {
        const payment = {
          communityId: parcelBilling.communityId,
          phase: 'bill',
          valueDate: new Date(parcelBilling.year, i - 1, BILLING_DAY_OF_THE_MONTH),
          amount: -1 * amount,
          accountFrom: parcelBilling.accountFrom,
          note: parcelBilling.note,
        };
        payment.accountFrom['Localizer'] = parcel.serial.toString();
//        Payments.update(query, { $set: doc }, { upsert: true });
        Payments.insert(payment);
      });
    });
  },
});

export const insert = new ValidatedMethod({
  name: 'parcelBillings.insert',
  validate: ParcelBillings.simpleSchema().validator({ clean: true }),

  run(doc) {
    const id = ParcelBillings.insert(doc);
    apply._execute({ userId: this.userId }, { id });
    return id;
  },
});
