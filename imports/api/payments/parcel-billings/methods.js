import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/payments/parcel-billings/parcel-billings.js';
import { Payments } from '/imports/api/payments/payments.js';
import { insertJournal } from '/imports/api/payments/journals.js';

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

      const journalParams = {
        'Owner payins': parcelBilling.account['Owner payins'],
        'Localizer': parcel.serial.toString(),
      };

      months.forEach((i) => {
        const txBase = {
          communityId: parcelBilling.communityId,
          phase: 'bill',
          valueDate: new Date(parcelBilling.year, i - 1, BILLING_DAY_OF_THE_MONTH),
          amount,
          note: parcelBilling.note,
        };
        insertJournal('Obligation', txBase, journalParams);
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
