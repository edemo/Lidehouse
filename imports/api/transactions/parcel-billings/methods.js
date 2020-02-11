import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Clock } from '/imports/utils/clock.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { checkExists, checkModifier, checkPermissions } from '/imports/api/method-checks.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Bills } from '/imports/api/transactions/bills/bills';
import { Period } from '/imports/api/transactions/breakdowns/period.js';
import { ActiveTimeMachine } from '/imports/api/behaviours/active-time-machine';
import { displayDate } from '/imports/ui_3/helpers/utils.js';

export const BILLING_DAY_OF_THE_MONTH = 10;
export const BILLING_MONTH_OF_THE_YEAR = 3;
export const BILLING_DUE_DAYS = 10;

function display(reading) {
  return `${reading.value.round(3)} (${displayDate(reading.date)})`; /* parcelBilling.consumption.decimals */
}

function lineDetails(currentBilling, lastBilling, lastReading) {
  let result = '';
  result += `  Legutóbbi számlázott óraállás: ${display(lastBilling)}`;
  result += `  Most számlázott óraállás: ${display(currentBilling)}`;
  if (lastBilling.date < lastReading.date) {
    result += `  Aktuális leolvasás: ${display(lastReading)}`;
  } else {
    result += `  Utolsó leolvasás: ${display(lastReading)}`;
  }
  return result;
}

export const apply = new ValidatedMethod({
  name: 'parcelBillings.apply',
  validate: ParcelBillings.applySchema.validator(),

  run({ communityId, date, ids, localizer }) {
    if (Meteor.isClient) return;
    checkPermissions(this.userId, 'parcelBillings.apply', { communityId });
    ActiveTimeMachine.runAtTime(date, () => {
      const billsToSend = {}; // parcelId => his bill
      const activeParcelBillings = ids
        ? ParcelBillings.findActive({ communityId, _id: { $in: ids } })
        : ParcelBillings.findActive({ communityId });
      const billingPeriod = Period.monthOfDate(date);
      activeParcelBillings.forEach((parcelBilling) => {
//        const alreadyAppliedAt = parcelBilling.alreadyAppliedAt(billingPeriod.label);
//        if (alreadyAppliedAt) throw new Meteor.Error('err_alreadyExists', `${parcelBilling.title} ${billingPeriod.label}`);
        const parcels = parcelBilling.parcels(localizer);
        parcels.forEach((parcel) => {
          productionAssert(parcel, 'Could not find parcel - Please check if parcel ref matches the building+floor+door exactly');
          const line = {
            billingId: parcelBilling._id,
            period: billingPeriod.label,
          };
          let activeMeter;
          let currentBilling;
          if (parcelBilling.consumption) {
            activeMeter = Meters.findOneActive({ parcelId: parcel._id, service: parcelBilling.consumption.service });
            if (activeMeter) {
              const charge = parcelBilling.consumption.charges.find(c => c.uom === activeMeter.uom);
              if (!charge) throw new Meteor.Error('err_invalidData', `The meter ${activeMeter.identifier} has to match the same uom, that the billing applies to`);
              line.uom = charge.uom;
              line.unitPrice = charge.unitPrice;
              // TODO: Estimation if no reading available
              line.quantity = 0;
              const lastBilling = activeMeter.lastBilling();
              const lastReading = activeMeter.lastReading();
              // ----- date ------ lastBilling ------ now |
              if (date < lastBilling.date) throw new Meteor.Error('err_notAllowed', `Cannot bill a consumption based billing at a time earlier (${date}) than the last billing (${lastBilling.date})`);
              // ---- lastBilling -----earlierReading ----- date ------ lastReading ------ now |
              if (date < lastReading.date) throw new Meteor.Error('err_notAllowed', `Cannot bill a consumption based billing at a time earlier (${date}) than the last reading (${lastReading.date})`);
              // ---- lastBilling -----lastReading ----- date ------ now |
              // ---- lastReading -----lastBilling ----- date ------ now |
              const value = activeMeter.getEstimatedValue(date);
              currentBilling = { date, value };
              line.quantity = (currentBilling.value - lastBilling.value).round(3); /* parcelBilling.consumption.decimals */
              line.details = lineDetails(currentBilling, lastBilling, lastReading);
            }
          }
          if (!activeMeter) {
            productionAssert(parcelBilling.projection, `Parcel ${parcel.ref} has no meter for billing ${parcelBilling.name}, and no projection is set up for this billing.`);
            line.unitPrice = parcelBilling.projection.unitPrice;
            line.uom = parcelBilling.projectionUom();
            line.quantity = parcelBilling.projectionQuantityOf(parcel);
          }
          productionAssert(line.uom && _.isDefined(line.quantity), 'A billing needs at least one of consumption or projection.');
          if (line.quantity === 0) return; // Should not create bill for zero amount
          line.title = parcelBilling.title;
          line.amount = line.quantity * line.unitPrice;
//          line.account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.digit;
          line.account = Breakdowns.name2code('Incomes', 'Owner payins', parcelBilling.communityId) + parcelBilling.digit;
          line.parcelId = parcel._id;
          line.localizer = Localizer.parcelRef2code(parcel.ref);
          if (currentBilling) { // Will need to update the meter's billings registry, so preparing the update
            line.meterUpdate = { _id: activeMeter._id, billing: currentBilling };
          }

          // Creating the bill - adding line to the bill
          const leadParcel = parcel.leadParcel();
          billsToSend[leadParcel._id] = billsToSend[leadParcel._id] || {
            communityId: parcelBilling.communityId,
            category: 'bill',
            relation: 'member',
            defId: Txdefs.findOne({ communityId, category: 'bill', 'data.relation': 'member' })._id,
  //          amount: Math.round(totalAmount), // Not dealing with fractions of a dollar or forint
            partnerId: leadParcel.payerPartner()._id,
            membershipId: leadParcel.payerMembership()._id,
            issueDate: Clock.currentDate(),
            deliveryDate: date,
            dueDate: moment(date).add(BILLING_DUE_DAYS, 'days').toDate(),
            lines: [],
          };
          billsToSend[leadParcel._id].lines.push(line);
        });

        ParcelBillings.update(parcelBilling._id, { $push: { appliedAt: { date, period: billingPeriod.label } } });
      });

      _.each(billsToSend, (bill, leadParcelId) => {
        const meterUpdates = [];
        bill.lines.forEach((line) => {
          if (line.meterUpdate) meterUpdates.push(line.meterUpdate);
          delete line.meterUpdate;
        });
        const billId = Transactions.methods.insert._execute({ userId: this.userId }, bill);
        meterUpdates.forEach((meterUpdate) => {
          meterUpdate.billing.billId = billId;
          Meters.methods.registerBilling._execute({ userId: this.userId }, meterUpdate);
        });
      });
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
    return ParcelBillings.remove(_id);
  },
});

ParcelBillings.methods = ParcelBillings.methods || {};
_.extend(ParcelBillings.methods, { insert, update, remove, apply, revert });
