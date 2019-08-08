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
  validate: ParcelBillings.applySchema.validator(),

  run({ id, valueDate }) {
    const parcelBilling = ParcelBillings.findOne(id);
    const parcels = parcelBilling.parcels();
    let totalAmount = 0;
    const issuedBills = [];
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
      const account = Breakdowns.name2code('Assets', 'Owner obligations', parcelBilling.communityId) + parcelBilling.payinType;
      const localizer = Localizer.parcelRef2code(parcel.ref);
      issuedBills.push({ communityId: parcelBilling.communityId, category: 'parcel',
        amount, account, localizer, partner: localizer,
        valueDate, issueDate: moment().toDate(), dueDate: moment().add(BILLING_DUE_DAYS, 'days').toDate(),
      });
      debitLegs.push({ amount, account, localizer });
    });

    const tx = {
      communityId: parcelBilling.communityId,
      valueDate,
      amount: totalAmount,
//        defId: TxDefs.findOne({ communityId: parcelBilling.communityId, name: 'Obligation' }),
      credit: [{
        account: Breakdowns.name2code('Incomes', 'Owner payins', parcelBilling.communityId) + parcelBilling.payinType,
      }],
      // debit will be filled out later
      note: parcelBilling.note,
    };
    const txId = insertTx._execute({ userId: this.userId }, tx);

    issuedBills.forEach((bill, i) => {
      const billId = Bills.insert(_.extend(bill, { txId }));
      _.extend(debitLegs[i], { billId });
    });
    Transactions.update(txId, { $set: { debit: debitLegs, reconciled: true } });
    ParcelBillings.update(id, { $push: { appliedAt: valueDate } });
    return txId;
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
    checkPermissions(this.userId, 'transactions.insert', doc.communityId);
    const valueDate = doc.valueDate;
    delete doc.valueDate;
    const id = ParcelBillings.insert(doc);
    if (Meteor.isServer) {
      if (valueDate) { // new parcel billings are automatically applied, if valueDate is given
        apply._execute({ userId: this.userId }, { id, valueDate });
      }
    }
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

    return ParcelBillings.update({ _id }, { $set: doc });
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
