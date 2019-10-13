import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { debugAssert } from '/imports/utils/assert.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
//  import { TxDefs } from '/imports/api/transactions/tx-defs.js';
import { insert as insertTx } from '/imports/api/transactions/methods.js';
import { Bills } from '../bills/bills';

export const BILLING_DAY_OF_THE_MONTH = 10;
export const BILLING_MONTH_OF_THE_YEAR = 3;
export const BILLING_DUE_DAYS = 8;

export const apply = new ValidatedMethod({
  name: 'parcelBillings.apply',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    valueDate: { type: Date },
  }).validator(),

  run({ communityId, valueDate }) {
    checkPermissions(this.userId, 'parcelBillings.apply', communityId);
    const bills = {}; // parcelId => his bill
    const activeParcelBillings = ParcelBillings.find({ communityId, active: true });
    activeParcelBillings.forEach(parcelBilling => {
      const parcels = parcelBilling.parcels();
      parcels.forEach((parcel) => {
        const line = {};
        line.title = parcelBilling.title;
        let activeMeter;
        if (parcelBilling.consumption) {
          activeMeter = Meters.findOne({ parcelId: parcel._id, service: parcelBilling.consumption, active: true });
          if (activeMeter) {
            line.unitPrice = parcelBilling.unitPrice;
            line.uom = parcelBilling.uom;
            // TODO: Estimation if no reading available
            line.quantity = (activeMeter.lastReading().value - activeMeter.lastBilling().value);
          }
        }
        if (!activeMeter) {
          line.unitPrice = parcelBilling.amount;
          switch (parcelBilling.projection) {
            case 'absolute':
              line.uom = '1';
              line.quantity = 1;
              break;
            case 'area':
              line.uom = 'm2';
              line.quantity = (parcel.area || 0);
              break;
            case 'volume':
              line.uom = 'm3';
              line.quantity = (parcel.volume || 0);
              break;
            case 'habitants':
              line.uom = 'p';
              line.quantity = (parcel.habitants || 0);
              break;
            default: debugAssert(false, 'No such projection');
          }
        }
        debugAssert(line.uom && _.isDefined(line.quantity), 'Billing needs consumption or projection.');
        if (line.quantity === 0) return; // Should not create bill for zero amount

        line.account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.payinType;
        line.localizer = Localizer.parcelRef2code(parcel.ref);
        
        bills[parcel._id] = bills[parcel._id] || {
          communityId: parcelBilling.communityId,
          category: 'parcel',
//          amount: Math.round(totalAmount), // Not dealing with fractions of a dollar or forint
          partner: parcel.ref,
          valueDate,
          issueDate: moment().toDate(),
          dueDate: moment().add(BILLING_DUE_DAYS, 'days').toDate(),
          lines: [],
        };
        bills[parcel._id].lines.push(line);

        if (activeMeter) {
          Meters.methods.registerBilling._execute({ userId: this.userId }, {
            _id: activeMeter._id,
            billing: {
              date: new Date(),
              value: activeMeter.lastReading().value,
              type: 'reading',
  //            readingId
  //            billId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
            },
          });
        }
      });
    });

    _.each(bills, (bill, parcelId) => {
      Bills.methods.insert._execute({ userId: this.userId }, bill);
    });
  },
});

export const revert = new ValidatedMethod({
  name: 'parcelBillings.revert',
  validate: new SimpleSchema({
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
    valueDate: { type: Date },
  }).validator(),

  run({ id, valueDate }) {
    throw new Meteor.Error('err_NotImplemented', 'TODO');
  },
});

export const insert = new ValidatedMethod({
  name: 'parcelBillings.insert',
  validate: ParcelBillings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'parcelBillings.insert', doc.communityId);
    const id = ParcelBillings.insert(doc);
    return id;
  },
});

export const update = new ValidatedMethod({
  name: 'parcelBillings.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(ParcelBillings, _id);
//    checkModifier(doc, modifier, );
    checkPermissions(this.userId, 'parcelBillings.update', doc.communityId);
    return ParcelBillings.update({ _id }, { $set: modifier });
  },
});

export const remove = new ValidatedMethod({
  name: 'parcelBillings.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(ParcelBillings, _id);
    checkPermissions(this.userId, 'parcelBillings.remove', doc.communityId);
    return ParcelBillings.remove(_id);
  },
});

ParcelBillings.methods = ParcelBillings.methods || {};
_.extend(ParcelBillings.methods, { insert, update, remove, apply, revert });
