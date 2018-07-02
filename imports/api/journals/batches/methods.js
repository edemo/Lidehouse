import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { ParcelBillings } from '/imports/api/journals/batches/parcel-billings.js';
import { Journals } from '/imports/api/journals/journals.js';
//  import { TxDefs } from '/imports/api/journals/tx-defs.js';
import { insert as insertTx } from '/imports/api/journals/methods.js';

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
      // Not dealing with fractions of a dollar or forint
      amount = Math.round(amount);

      let months;
      if (parcelBilling.month === 'allMonths') {
        months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      } else if (parcelBilling.month) {
        months = [parseInt(parcelBilling.month, 10)];
      } else {
        months = [BILLING_MONTH_OF_THE_YEAR];
      }

      months.forEach((i) => {
        const txForMonth = {
          communityId: parcelBilling.communityId,
          valueDate: new Date(parcelBilling.year, i - 1, BILLING_DAY_OF_THE_MONTH),
          amount,
  //        defId: TxDefs.findOne({ communityId: parcelBilling.communityId, name: 'Obligation' }),
          from: [{
            account: {
              'Owners': parcelBilling.account['Owner payins'],
              'Localizer': parcel.serial.toString(),
            },
          }],
          to: [{
            account: {
              'Assets': parcelBilling.account['Owner payins'],
              'Localizer': parcel.serial.toString(),
            },
          }],
          note: parcelBilling.note,
        };
        insertTx._execute({ userId: this.userId }, txForMonth);
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
