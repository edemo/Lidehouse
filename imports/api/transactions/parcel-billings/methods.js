import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Log } from '/imports/utils/log.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Bills } from '/imports/api/transactions/bills/bills';
import { Period } from '/imports/api/transactions/periods/period.js';
import { ActiveTimeMachine } from '/imports/api/behaviours/active-time-machine';
import { displayDate } from '/imports/ui_3/helpers/utils.js';

export const BILLING_DAY_OF_THE_MONTH = 10;
export const BILLING_MONTH_OF_THE_YEAR = 3;
export const BILLING_DUE_DAYS = 8;

function display(reading) {
  return `${reading.value.toFixed(3)} (${displayDate(reading.date)})`; /* parcelBilling.consumption.decimals */
}

function lineDetails(meter, currentBilling, lastBilling, lastReading) {
  let result = '';
  result += `  Legutóbbi számlázott óraállás: ${display(lastBilling)}`;
  result += `  Most számlázott óraállás: ${display(currentBilling)}`;
  if (lastBilling.date < lastReading.date) {
    result += `  Aktuális leolvasás: ${display(lastReading)}`;
  } else {
    result += `  Utolsó leolvasás: ${display(lastReading)}`;
  }
  result += ` Mérőóra: ${meter.identifier}`;
  return result;
}

export const apply = new ValidatedMethod({
  name: 'parcelBillings.apply',
  validate: ParcelBillings.applySchema.validator(),

  run({ communityId, date, ids, localizer, withFollowers }) {
    if (Meteor.isClient) return;
    checkPermissions(this.userId, 'parcelBillings.apply', { communityId });
    if (Date.now() < date) throw new Meteor.Error('err_invalidData', 'Not possible to bill with future date', date);
    const relationAccount = Accounts.getByName('Members', communityId).code;
    const incomeAccount = Accounts.getByName('Owner payins', communityId).code;
    ActiveTimeMachine.runAtTime(date, () => {
      const billsToSend = {}; // parcelId => his bill
      const activeParcelBillings = ids
        ? ParcelBillings.findActive({ communityId, _id: { $in: ids } }, { sort: { rank: 1 } })
        : ParcelBillings.findActive({ communityId }, { sort: { rank: 1 } });
      const billingPeriod = Period.monthOfDate(date);
      const activeParcels = ParcelBillings.filterParcelsByLocalizer(communityId, localizer, withFollowers);

      activeParcelBillings.forEach((parcelBilling) => {
//        const alreadyAppliedAt = parcelBilling.alreadyAppliedAt(billingPeriod.label);
//        if (alreadyAppliedAt) throw new Meteor.Error('err_alreadyExists', `${parcelBilling.title} ${billingPeriod.label}`);
        const parcels = parcelBilling.parcelsToBill().filter(b => activeParcels.find(a => a._id === b._id));
        parcels.forEach((parcel) => {
          productionAssert(parcel, 'Could not find parcel - Please check if parcel ref matches the building+floor+door exactly');
          function addLineToBill(line) {
            productionAssert(line.uom && _.isDefined(line.quantity), 'A billing needs at least one of consumption or projection');
            line.title = parcelBilling.title;
            line.amount = line.quantity * line.unitPrice;
            if (line.amount === 0) return; // Should not create bill for zero amount
            line.account = incomeAccount + parcelBilling.digit;
            line.parcelId = parcel._id;
            line.localizer = parcel.code;
            line.billing = { id: parcelBilling._id, period: billingPeriod.label };

            // Creating the bill - adding line to the bill
            const leadParcel = parcel.leadParcel();
            const issueDate = Clock.currentDate();
            billsToSend[leadParcel._id] = billsToSend[leadParcel._id] || {
              communityId: parcelBilling.communityId,
              category: 'bill',
              relation: 'member',
              defId: Txdefs.findOneT({ communityId, category: 'bill', 'data.relation': 'member' })._id,
    //          amount: Math.round(totalAmount), // Not dealing with fractions of a dollar or forint
              partnerId: leadParcel.payerPartner()._id,
              contractId: leadParcel.payerContract()._id,
              relationAccount,
              issueDate,
              deliveryDate: date,
              dueDate: moment(issueDate).add(BILLING_DUE_DAYS, 'days').toDate(),
              lines: [],
            };
            billsToSend[leadParcel._id].lines.push(line);
          }

          let activeMeters = [];
          if (parcelBilling.consumption) {
            activeMeters = Meters.findActive({ parcelId: parcel._id, service: parcelBilling.consumption.service }).fetch();
            activeMeters.forEach(activeMeter => {
              const line = {};
              const charge = parcelBilling.consumption.charges.find(c => c.uom === activeMeter.uom);
              if (!charge) throw new Meteor.Error('err_invalidData', 'The meter has to match the same uom, that the billing applies to', { identifier: activeMeter.identifier });
              line.uom = charge.uom;
              line.unitPrice = charge.unitPrice;
              // TODO: Estimation if no reading available
              line.quantity = 0;
              const lastBilling = activeMeter.lastBilling(); delete lastBilling.billId;
              const lastReading = activeMeter.lastReading(date);
              if (date < lastBilling.date) throw new Meteor.Error('err_invalidData', 'The meter was already billed at a later date', { identifier: activeMeter.identifier, lastBillingDate: lastBilling.date });
              const value = activeMeter.getEstimatedValue(date);
              const currentBilling = { date, value };
              // Log.debug(`Consumption billing of meter ${activeMeter._id}`, 'currentBilling', JSON.stringify(currentBilling), 'lastBilling', JSON.stringify(lastBilling), 'lastReading', JSON.stringify(lastReading));
              line.metering = { id: activeMeter._id, start: lastBilling, end: currentBilling };
              line.quantity = Math.roundToDecimals(currentBilling.value - lastBilling.value, 3); /* parcelBilling.consumption.decimals */
              line.details = lineDetails(activeMeter, currentBilling, lastBilling, lastReading);
              addLineToBill(line);
            });
          }
          if (!activeMeters.length) {
            if (!parcelBilling.projection) throw new Meteor.Error('err_invalidData', 'Parcel has no meter for billing, and no projection is set up for this billing', { parcel: parcel.ref, parcelBilling: parcelBilling.title });
            const line = {};
            line.unitPrice = parcelBilling.projection.unitPrice;
            line.uom = parcelBilling.projectionUom();
            line.quantity = parcelBilling.projectionQuantityOf(parcel);
            addLineToBill(line);
          }
        });

        ParcelBillings.update(parcelBilling._id, { $push: { appliedAt: { date, period: billingPeriod.label } } });
      });

      _.each(billsToSend, (bill, leadParcelId) => {
        bill.lines = _.sortBy(bill.lines, line => (line.parcelId === leadParcelId ? '' : line.localizer));
        const billId = Transactions.methods.insert._execute({ userId: this.userId }, bill);
      });
    });
  },
});

export const revert = new ValidatedMethod({
  name: 'parcelBillings.revert',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    date: { type: Date },
  }).validator(),

  run({ _id, date }) {
    if (Meteor.isClient) return;
    const doc = checkExists(ParcelBillings, _id);
    const communityId = doc.communityId;
    checkPermissions(this.userId, 'parcelBillings.apply', { communityId });
    const txs = Transactions.find({ deliveryDate: date, 'lines.billing.id': _id }).fetch();
    txs.forEach(tx => {
      Transactions.methods.remove._execute({ userId: this.userId }, { _id: tx._id });
                    // This will result in a STORNO tx, when the tx is already posted
    });
  },
});

export const insert = new ValidatedMethod({
  name: 'parcelBillings.insert',
  validate: ParcelBillings.simpleSchema().validator({ clean: true }),

  run(doc) {
    checkPermissions(this.userId, 'parcelBillings.insert', doc);
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
    checkPermissions(this.userId, 'parcelBillings.update', doc);
    return ParcelBillings.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'parcelBillings.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    const doc = checkExists(ParcelBillings, _id);
    checkPermissions(this.userId, 'parcelBillings.remove', doc);
    if (doc.applyCount() > 0) {
      throw new Meteor.Error('err_unableToRemove', 'Not possible to remove billing, if it was already applied, archive it instead');
    }
    return ParcelBillings.remove(_id);
  },
});

ParcelBillings.methods = ParcelBillings.methods || {};
_.extend(ParcelBillings.methods, { insert, update, remove, apply, revert });
