/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/batches/parcel-billings.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js'

if (Meteor.isServer) {
  let Fixture;

  describe('parcel billings', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      Bills.remove({});
      ParcelBillings.remove({});
      Transactions.remove({});
    });
    after(function () {
    });

    describe('api', function () {
      before(function () {
        Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          localizer: '@',
          note: 'Test parcel-billing',
        });
      });

      it('works', function () {
        const testParcelBilling = ParcelBillings.findOne({ note: 'Test parcel-billing' });
        chai.assert.isDefined(testParcelBilling);
      });

      it('creates debit legs per parcels', function () {
        const parcelNumber = Fixture.dummyParcels.length;
        const debitLegs = Transactions.findOne({ note: 'Test parcel-billing' }).debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });
    });
  
    describe('calculation', function () {
      before(function () {
      });

      it('calculates correctly per area', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'perArea',
          amount: 78,
          payinType: '3',
          localizer: '@',
          note: 'Test area',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test area' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(parcel.area * testParcelBilling.amount);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });

      it('calculates correctly per volume', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'perVolume',
          amount: 78,
          payinType: '5',
          localizer: '@',
          note: 'Test volume',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test volume' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(parcel.volume * testParcelBilling.amount);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });

      it('calculates correctly per habitants', function () {
        let habitants = 1;
        Fixture.dummyParcels.forEach((parcel) => {
          Parcels.update(parcel, { $set: { habitants }});
          habitants += 1;
        });
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'perHabitant',
          amount: 155,
          payinType: '6',
          localizer: '@',
          note: 'Test habitants',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test habitants' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.habitants);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });
    });

    describe('value date', function () {
      xit('writes transactions for the right date', function () {
      });
    });

    describe('no values given', function () {
      before(function () {
        const parcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, ref: 'A89', building: 'A', floor: 8, door: 9, units: 20 });
        const extraParcel = Parcels.findOne(parcelId);
        Localizer.addParcel(Fixture.demoCommunityId, extraParcel, 'en');
      });

      it('does not brake when area is missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'perArea',
          amount: 78,
          payinType: '4',
          localizer: '@',
          note: 'one area is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one area is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.area || 0);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count(); 
        const debitLegs = transaction.debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });
      
      it('does not brake when volume is missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'perVolume',
          amount: 78,
          payinType: '4',
          localizer: '@',
          note: 'one volume is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one volume is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.volume || 0);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count(); 
        const debitLegs = transaction.debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

      it('does not brake when habitants are missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'perHabitant',
          amount: 140,
          payinType: '1',
          localizer: '@',
          note: 'one habitant is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one habitant is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.amount * parcel.habitants || 0);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count(); 
        const debitLegs = transaction.debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

      it('does not brake when building/floor/door is missing', function () {
        const parcelId2 = Parcels.insert({ communityId: Fixture.demoCommunityId, ref: 'A75', units: 20 });
        const parcelWithoutDetails = Parcels.findOne(parcelId2);
        Localizer.addParcel(Fixture.demoCommunityId, parcelWithoutDetails, 'en');
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'absolute',
          amount: 150,
          payinType: '3',
          localizer: '@',
          note: 'no parcel details',
        });
        const testParcelBilling = ParcelBillings.findOne({ note: 'no parcel details' });
        Parcels.find({ communityId: Fixture.demoCommunityId }).count();
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count();
        const debitLegs = Transactions.findOne({ note: 'no parcel details'}).debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

    });
  });
}
