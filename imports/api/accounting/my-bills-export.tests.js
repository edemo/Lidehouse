/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai } from 'meteor/practicalmeteor:chai';
import { freshFixture } from '/imports/api/test-utils.js';
import { moment } from 'meteor/momentjs:moment';

import { Transactions } from '/imports/api/accounting/transactions.js';
import { ParcelBillings } from '/imports/api/accounting/parcel-billings/parcel-billings.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { myBillsExport } from './my-bills-export.js';

if (Meteor.isServer) {
  describe('my bills export', function () {
    this.timeout(25000);
    let Fixture;
    let communityId;
    let userId3;      // owner of parcel 3 (sole owner, representor)
    let userId4;      // representor owner of parcel 4
    let contractOfParcel3;
    let accountant;
    let applyParcelBillings;
    let postBills;
    let exportMyBills;

    before(function () {
      Fixture = freshFixture();
      communityId = Fixture.demoCommunityId;
      userId3 = Fixture.dummyUsers[3];
      userId4 = Fixture.dummyUsers[4];
      contractOfParcel3 = Contracts.findOne({ communityId, parcelId: Fixture.dummyParcels[3] });
      accountant = Fixture.builder.getUserWithRole('accountant');
      applyParcelBillings = function (date) {
        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: moment.utc(date).toDate() }, accountant);
      };
      postBills = function (date) {
        Transactions.find({ communityId, category: 'bill', deliveryDate: moment.utc(date).toDate() }).forEach((tx) => {
          if (!tx.isPosted()) {
            Fixture.builder.execute(Transactions.methods.post, { _id: tx._id }, accountant);
          }
        });
      };
      exportMyBills = function (userId, begin, end) {
        return myBillsExport._execute({ userId }, { begin, end });
      };
    });

    beforeEach(function () {
      ParcelBillings.remove({});
      Transactions.remove({});
      Fixture.builder.create('parcelBilling', {
        title: 'Test export',
        projection: {
          base: 'absolute',
          unitPrice: 1000,
        },
        digit: '4',
        localizer: '@',
      });
    });

    it('exports only posted bills whose valueDate is inside the date range', function () {
      applyParcelBillings('2018-01-12'); postBills('2018-01-12');   // posted, in range -> included
      applyParcelBillings('2018-02-12');                            // draft -> excluded
      applyParcelBillings('2018-03-12'); postBills('2018-03-12');
      const billToVoid = Transactions.findOne({ category: 'bill', contractId: contractOfParcel3._id, deliveryDate: moment.utc('2018-03-12').toDate() });
      Fixture.builder.execute(Transactions.methods.remove, { _id: billToVoid._id }, accountant);  // void -> excluded
      applyParcelBillings('2017-12-12'); postBills('2017-12-12');   // posted, out of range -> excluded

      const result = exportMyBills(userId3, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());

      chai.assert.isDefined(result.bills, 'export has a bills list');
      chai.assert.equal(result.bills.length, 1);
      chai.assert.equal(result.bills[0].deliveryDate.getTime(), moment.utc('2018-01-12').toDate().getTime());
    });

    it('exports only bills of the requesting user', function () {
      applyParcelBillings('2018-01-12'); postBills('2018-01-12');

      const result3 = exportMyBills(userId3, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());
      chai.assert.equal(result3.bills.length, 1);
      chai.assert.include(result3.bills[0].lines.map(l => l.parcelId), Fixture.dummyParcels[3]);

      const result4 = exportMyBills(userId4, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());
      chai.assert.equal(result4.bills.length, 1);
      chai.assert.include(result4.bills[0].lines.map(l => l.parcelId), Fixture.dummyParcels[4]);
      chai.assert.notEqual(result4.bills[0].serialId, result3.bills[0].serialId);
    });

    it('includes both boundary days of the date range', function () {
      applyParcelBillings('2018-01-01'); postBills('2018-01-01');
      applyParcelBillings('2018-01-31'); postBills('2018-01-31');

      const result = exportMyBills(userId3, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());
      chai.assert.equal(result.bills.length, 2);
    });

    it('exports communities, parcels, meters, parcelBillings and bills in dependency order, with resolving ids', function () {
      applyParcelBillings('2018-01-12'); postBills('2018-01-12');

      const result = exportMyBills(userId3, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());

      chai.assert.deepEqual(Object.keys(result), ['communities', 'parcels', 'meters', 'parcelBillings', 'bills']);

      // only the community where the user owns a flat
      chai.assert.equal(result.communities.length, 1);
      chai.assert.equal(result.communities[0]._id, communityId);
      chai.assert.notEqual(result.communities[0]._id, Fixture.otherCommunityId);

      // every id referenced by a bill resolves to an entity in an earlier list
      const communityIds = result.communities.map(c => c._id);
      const parcelIds = result.parcels.map(p => p._id);
      const meterIds = result.meters.map(m => m._id);
      const parcelBillingIds = result.parcelBillings.map(pb => pb._id);
      result.bills.forEach((bill) => {
        chai.assert.include(communityIds, bill.communityId);
        bill.lines.forEach((line) => {
          chai.assert.include(parcelIds, line.parcelId);
          chai.assert.include(parcelBillingIds, line.billing.id);
        });
      });
      result.meters.forEach((meter) => {
        chai.assert.include(parcelIds, meter.parcelId);
      });

      // bills carry only the exported subset of fields
      result.bills.forEach((bill) => {
        chai.assert.isUndefined(bill.payments);
        chai.assert.isUndefined(bill.partnerId);
        chai.assert.isUndefined(bill.contractId);
        chai.assert.isUndefined(bill.defId);
        chai.assert.isUndefined(bill.relation);
        chai.assert.isUndefined(bill.debit);
        chai.assert.isUndefined(bill.credit);
        chai.assert.isDefined(bill.serialId);
        chai.assert.isDefined(bill.amount);
        chai.assert.isDefined(bill.status);
        bill.lines.forEach((line) => {
          chai.assert.isDefined(line.title);
          chai.assert.isDefined(line.quantity);
          chai.assert.isDefined(line.unitPrice);
          chai.assert.isDefined(line.amount);
          chai.assert.isDefined(line.parcelId);
          chai.assert.isDefined(line.localizer);
          chai.assert.isDefined(line.billing);
        });
      });
    });

    it('includes the follower parcel in the parcels list, when its line is on an exported bill', function () {
      applyParcelBillings('2018-01-12'); postBills('2018-01-12');

      const result = exportMyBills(userId3, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());
      const followerParcelId = Fixture.dummyParcels[1];
      chai.assert.include(result.parcels.map(p => p._id), followerParcelId);
    });

    it('exports the meters referenced by consumption lines', function () {
      const meterId = Fixture.builder.create('meter', {
        parcelId: Fixture.dummyParcels[3],
        identifier: 'CW-01010101',
        service: 'coldWater',
        uom: 'm3',
        activeTime: { begin: new Date('2018-01-01') },
      });
      Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-01-01'), value: 10 } });
      ParcelBillings.remove({});
      Fixture.builder.create('parcelBilling', {
        title: 'Test consumption',
        consumption: {
          service: 'coldWater',
          charges: [{ uom: 'm3', unitPrice: 600 }],
        },
        projection: {
          base: 'habitants',
          unitPrice: 5000,
        },
        digit: '3',
        localizer: '@A103',
      });
      applyParcelBillings('2018-01-12'); postBills('2018-01-12');

      const result = exportMyBills(userId3, moment.utc('2018-01-01').toDate(), moment.utc('2018-01-31').toDate());
      chai.assert.equal(result.bills.length, 1);
      const line = result.bills[0].lines[0];
      chai.assert.isDefined(line.metering);
      chai.assert.equal(line.metering.id, meterId);
      chai.assert.include(result.meters.map(m => m._id), meterId);
      const meter = result.meters.find(m => m._id === meterId);
      chai.assert.include(result.parcels.map(p => p._id), meter.parcelId);
      chai.assert.isUndefined(meter.readings);
    });

    it('rejects unregistered users', function () {
      chai.assert.throws(() => myBillsExport.call({ begin: moment.utc('2018-01-01').toDate(), end: moment.utc('2018-01-31').toDate() }), 'err_notLoggedIn');
    });
  });
}