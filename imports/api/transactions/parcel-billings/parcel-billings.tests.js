/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { moment } from 'meteor/momentjs:moment';
import { Clock } from '/imports/utils/clock.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';

// TODO: import chai-datetime.js -- preferably through npm
// and use equalDate here
// https://www.chaijs.com/plugins/chai-datetime/
chai.assert.equalDate = function equalDate(d1, d2) {
  return chai.assert.equal(moment(d1).format('L'), moment(d2).format('L'));
};

if (Meteor.isServer) {
  let Fixture;

  describe('parcel billings', function () {
    this.timeout(15000);
    before(function () {
    });
    after(function () {
    });

    describe('api', function () {
      let communityId;
      let parcels;
      beforeEach(function () {
        Fixture = freshFixture();
        communityId = Fixture.demoCommunityId;
        parcels = Parcels.find({ communityId }).fetch();
        Meters.remove({});
        ParcelBillings.remove({});
        Transactions.remove({});
      });

      it('will not apply inactive parcelBilling', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test INACTIVE',
          projection: 'absolute',
          projectedPrice: 1000,
          payinType: '4',
          localizer: '@',
          activeTime: {
            begin: moment().subtract(3, 'day').toDate(),
            end: moment().subtract(1, 'day').toDate(),
          },
        });
        const testParcelBilling = ParcelBillings.findOne({ title: 'Test INACTIVE' });
        chai.assert.isDefined(testParcelBilling);
        chai.assert.isFalse(testParcelBilling.active);

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date() }, Fixture.builder.getUserWithRole('accountant'));

        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 0);
      });

      it('can apply single billing', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test area',
          projection: 'area',
          projectedPrice: 78,
          payinType: '3',
          localizer: '@',
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-01-12') }, Fixture.builder.getUserWithRole('accountant'));

        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, parcels.length);
        bills.forEach(bill => {
          chai.assert.isDefined(bill.partnerId);
          const parcel = Memberships.findOne(bill.partnerId).parcel();

          chai.assert.equal(bill.lines.length, 1);
          const line = bill.lines[0];
          chai.assert.equal(line.title, 'Test area');
          chai.assert.equal(line.period, '2018-01');
          chai.assert.equal(line.uom, 'm2');
          chai.assert.equal(line.unitPrice, 78);
          chai.assert.equal(line.quantity, parcel.area);
          chai.assert.equal(line.localizer, '@'+parcel.ref);
        });
      });

      xit('will not apply for same period twice', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test area',
          projection: 'area',
          projectedPrice: 78,
          payinType: '3',
          localizer: '@',
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-01-12') }, Fixture.builder.getUserWithRole('accountant'));
        chai.assert.throws(() =>
          Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-01-15') }, Fixture.builder.getUserWithRole('accountant')),
          'err_alreadyExists'
        );
        // but can apply for a different period
        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-02-10') }, Fixture.builder.getUserWithRole('accountant'));
      });

      it('can apply multiple projections', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test volume',
          projection: 'volume',
          projectedPrice: 56,
          payinType: '2',
          localizer: '@',
        });
        Fixture.builder.create('parcelBilling', {
          title: 'Test absolute',
          projection: 'absolute',
          projectedPrice: 1000,
          payinType: '4',
          localizer: '@',
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-01-12') }, Fixture.builder.getUserWithRole('accountant'));
        
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, parcels.length);
        bills.forEach(bill => {
          chai.assert.isDefined(bill.partnerId);
          const parcel = Memberships.findOne(bill.partnerId).parcel();

          chai.assert.equal(bill.lines.length, 2);
          const line0 = bill.lines[0];
          chai.assert.equal(line0.title, 'Test volume');
          chai.assert.equal(line0.uom, 'm3');
          chai.assert.equal(line0.unitPrice, 56);
          chai.assert.equal(line0.quantity, parcel.volume);
          chai.assert.equal(line0.localizer, '@'+parcel.ref);
          const line1 = bill.lines[1];
          chai.assert.equal(line1.title, 'Test absolute');
          chai.assert.equal(line1.uom, 'piece');
          chai.assert.equal(line1.unitPrice, 1000);
          chai.assert.equal(line1.quantity, 1);
          chai.assert.equal(line1.localizer, '@'+parcel.ref);
        });
      });

      xit('can apply consumption based billing', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test consumption',
          consumption: 'coldWater',
          uom: 'm3',
          unitPrice: 600,
          projection: 'habitants',
          projectedPrice: 5000,
          payinType: '3',
          localizer: '@',
        });
        const meteredParcelId = Fixture.dummyParcels[0];
        const meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-01010101',
          service: 'coldWater',
          activeTime: { begin: new Date('2018-01-01') },
        });

        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-01-12') }, Fixture.builder.getUserWithRole('accountant'));

        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, parcels.length - 1);
        bills.forEach(bill => {
          chai.assert.isDefined(bill.partnerId);
          const parcel = Memberships.findOne(bill.partnerId).parcel();

          chai.assert.equal(bill.lines.length, 1);
          const line = bill.lines[0];
          chai.assert.equal(line.title, 'Test consumption');
          chai.assert.equal(line.uom, 'habitant');
          chai.assert.equal(line.unitPrice, 5000);
          chai.assert.equal(line.quantity, parcel.habitants);

          chai.assert.equal(parcel.payer().outstanding, line.amount);
          chai.assert.equal(parcel.outstanding, line.amount);
        });

        Transactions.remove({});

        Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-02-01'), value: 32 } });
        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date('2018-02-12') }, Fixture.builder.getUserWithRole('accountant'));

        const meteredParcel = Parcels.findOne(meteredParcelId);
        const bills2 = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills2.length, parcels.length);
        const bill = Transactions.findOne({ category: 'bill', partnerId: meteredParcel.payer()._id });
        chai.assert.equal(bill.lines.length, 1);
        const line = bill.lines[0];
        chai.assert.equal(line.title, 'Test consumption');
        chai.assert.equal(line.uom, 'm3');
        chai.assert.equal(line.unitPrice, 600);
        chai.assert.equal(line.quantity, 32);

        chai.assert.equal(meteredParcel.payer().outstanding, bill.amount);
        chai.assert.equal(meteredParcel.outstanding, bill.amount);
      });
    });

    describe('consumption calculation', function () {
//      let parcelBillingId;
//      let meteredParcelId;
//      let meterId;
      let registerReading;
      let applyParcelBilling;
      let assertBilled;
      before(function () {
        Meters.remove({});
        ParcelBillings.remove({});
        Transactions.remove({});

        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          title: 'Test consumption',
          consumption: 'coldWater',
          uom: 'm3',
          unitPrice: 600,
          projection: 'habitants',
          projectedPrice: 5000,
          payinType: '3',
          localizer: '@',
        });
        const meteredParcelId = Fixture.dummyParcels[1];
        const meteredParcel = Parcels.findOne(meteredParcelId);
        const meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-01010101',
          service: 'coldWater',
          activeTime: { begin: new Date('2018-01-22') },
        });
        const communityId = Fixture.demoCommunityId;

        registerReading = function (date, value) {
          Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date(date), value } });
        };
        applyParcelBilling = function (date) {
          Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: new Date(date) }, Fixture.builder.getUserWithRole('accountant'));
        };
        assertBilled = function (date, projOrCons, quantity) {
          const bills = Transactions.find({ communityId, category: 'bill', 'lines.localizer': '@'+meteredParcel.ref }).fetch();
          if (!quantity) {
            chai.assert.equal(bills.length, 0);
          } else {
            chai.assert.equal(bills.length, 1);
            const bill = bills[0];
            chai.assert.equalDate(bill.deliveryDate, new Date(date));
            chai.assert.equalDate(bill.issueDate, Clock.currentDate());
            chai.assert.equal(bill.lines.length, 1);
            const line = bill.lines[0];
            if (projOrCons === 'consumption') chai.assert.equal(line.unitPrice, 600);
            else if (projOrCons === 'projection') chai.assert.equal(line.unitPrice, 5000);
            chai.assert.equal(line.quantity, quantity);
          }
        };
      });

      afterEach(function () {
        Transactions.remove({});
      });

      it('Can bill for before the meter was installed -> charged by projection', function () {
        applyParcelBilling('2018-01-12');
        assertBilled('2018-01-12', 'projection', 1);
      });

      it('Can bill a fresh meter -> no charge', function () {
        applyParcelBilling('2018-02-12');
        assertBilled('2018-02-22', 'consumtion', 0);
      });

      it('Can bill a reading', function () {
        registerReading('2018-03-01', 10);
        applyParcelBilling('2018-03-22');
        assertBilled('2018-03-22', 'consumtion', 10);
      });

      xit('Cannot accidentally bill for same period twice', function () {
        chai.assert.throws(() => {
          applyParcelBilling('2018-03-24');
        }, 'err_alreadyExists');
        assertBilled('2018-03-24', 'consumtion', 0);
      });
    });
/*
    xdescribe('apply', function () {
      before(function () {
      });

      xit('calculates correctly per volume', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'volume',
          projectedPrice: 78,
          payinType: '5',
          localizer: '@',
          note: 'Test volume',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test volume' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(parcel.volume * testParcelBilling.projectedPrice);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });

      xit('calculates correctly per habitants', function () {
        let habitants = 1;
        Fixture.dummyParcels.forEach((parcel) => {
          Parcels.update(parcel, { $set: { habitants }});
          habitants += 1;
        });
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'habitants',
          projectedPrice: 155,
          payinType: '6',
          localizer: '@',
          note: 'Test habitants',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'Test habitants' });
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.projectedPrice * parcel.habitants);
          chai.assert.equal(leg.amount, neededSum);
        });
        const parcelBillingTotal = transaction.amount;
        const parcelBillingDebitSum = transaction.debit.map(leg => leg.amount).reduce((partialsum, next) => partialsum + next);
        chai.assert.equal(parcelBillingTotal, parcelBillingDebitSum);
      });
    });

    xdescribe('value date', function () {
      xit('writes transactions for the right date', function () {
      });
    });

    xdescribe('no values given', function () {
      before(function () {
        const parcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, ref: 'A89', building: 'A', floor: 8, door: 9, units: 20 });
        const extraParcel = Parcels.findOne(parcelId);
        Localizer.addParcel(Fixture.demoCommunityId, extraParcel, 'en');
      });

      it('does not brake when area is missing', function () {
        const parcelBillingId = Fixture.builder.create('parcelBilling', {
          valueDate: new Date(),
          projection: 'area',
          projectedPrice: 78,
          payinType: '4',
          localizer: '@',
          note: 'one area is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one area is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.projectedPrice * parcel.area || 0);
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
          projection: 'volume',
          projectedPrice: 78,
          payinType: '4',
          localizer: '@',
          note: 'one volume is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one volume is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.projectedPrice * parcel.volume || 0);
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
          projection: 'habitants',
          projectedPrice: 140,
          payinType: '1',
          localizer: '@',
          note: 'one habitant is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ note: 'one habitant is missing'});
        transaction.debit.forEach((leg) => {
          const parcel = Parcels.findOne({ communityId: transaction.communityId, ref: Localizer.code2parcelRef(leg.localizer) });
          const neededSum = Math.round(testParcelBilling.projectedPrice * parcel.habitants || 0);
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
  */
  });
}
