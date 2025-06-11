/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Fraction } from 'fractional';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { moment } from 'meteor/momentjs:moment';
import { Clock } from '/imports/utils/clock.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Bills } from '/imports/api/transactions/bills/bills.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Meters } from '/imports/api/meters/meters.js';
import { Contracts } from '../../contracts/contracts';

// TODO: import chai-datetime.js -- preferably through npm
// and use equalDate here
// https://www.chaijs.com/plugins/chai-datetime/
chai.assert.equalDate = function equalDate(d1, d2) {
  return chai.assert.equal(moment(d1).format('L'), moment(d2).format('L'));
};

if (Meteor.isServer) {
  let Fixture;

  describe('parcel billings', function () {
    this.timeout(25000);
    let assertBillDetails;
    let assertLineDetails;
    let applyParcelBillings;
    let postParcelBillings;
    let revertParcelBillings;
    let communityId;
    let payerPartner2Id;
    let payerPartner3Id;
    let payerPartner4Id;

    before(function () {
      Fixture = freshFixture();
      communityId = Fixture.demoCommunityId;
      payerPartner2Id = Meteor.users.findOne(Fixture.dummyUsers[2]).partnerId(Fixture.demoCommunityId);
      payerPartner3Id = Meteor.users.findOne(Fixture.dummyUsers[3]).partnerId(Fixture.demoCommunityId);
      payerPartner4Id = Meteor.users.findOne(Fixture.dummyUsers[4]).partnerId(Fixture.demoCommunityId);
      const accountant = Fixture.builder.getUserWithRole('accountant');
      assertBillDetails = function(bill, expected) {
        chai.assert.equal(bill.partnerId, expected.payerPartnerId);
        chai.assert.equal(bill.lines.length, expected.linesLength);
        bill.lines.forEach((line) => {
          if (expected.lineTitle) chai.assert.equal(line.title, expected.lineTitle);
          if (expected.linePeriod) chai.assert.equal(line.billing.period, expected.linePeriod);
        });
      };
      assertLineDetails = function(line, expected) {
        chai.assert.equal(line.uom, expected.uom);
        chai.assert.equal(line.unitPrice, expected.unitPrice);
        chai.assert.equal(line.quantity, expected.quantity);
        chai.assert.equal(line.amount, Math.roundToDecimals(expected.unitPrice * expected.quantity, 2));
        chai.assert.equal(line.localizer, expected.localizer);
        if (expected.lineTitle) chai.assert.equal(line.title, expected.lineTitle);
        if (expected.linePeriod) chai.assert.equal(line.billing.period, expected.linePeriod);
      };
      applyParcelBillings = function (date) {
        Fixture.builder.execute(ParcelBillings.methods.apply, { communityId, date: moment.utc(date).toDate() }, accountant);
      };
      postParcelBillings = function (date) {
        const txs = Transactions.find({ communityId, category: 'bill', deliveryDate: moment.utc(date).toDate() });
        txs.forEach(tx => {
          if (!tx.isPosted())
            Fixture.builder.execute(Transactions.methods.post, { _id: tx._id }, accountant);
        });
      };
      revertParcelBillings = function (date) {
        const parcelBillings = ParcelBillings.find({ communityId });
        parcelBillings.forEach(billing => {
          Fixture.builder.execute(ParcelBillings.methods.revert, { _id: billing._id, date: moment.utc(date).toDate() }, accountant);
        });
      };
    });

    after(function () {
    });

    describe('api', function () {
      let formerMembershipId;
      let laterMembershipId;

      before(function() {
      });

      beforeEach(function () {
        ParcelBillings.remove({});
        Transactions.remove({});
      });

      it('will not apply inactive parcelBilling', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test INACTIVE',
          projection: {
            base: 'absolute',
            unitPrice: 1000,
          },
          digit: '4',
          localizer: '@',
          activeTime: {
            begin: moment().subtract(3, 'day').toDate(),
            end: moment().subtract(1, 'day').toDate(),
          },
        });
        const testParcelBilling = ParcelBillings.findOne({ title: 'Test INACTIVE' });
        chai.assert.isDefined(testParcelBilling);
        chai.assert.isFalse(testParcelBilling.active);

        applyParcelBillings(moment());
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 0);
      });

      it('can apply single billing to all parcels', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test area',
          projection: {
            base: 'area',
            unitPrice: 15,
          },
          digit: '3',
          localizer: '@',
        });

        applyParcelBillings('2018-01-12');
        const bills = Transactions.find({ communityId, category: 'bill' }, { sort: { amount: -1 } }).fetch();
        chai.assert.equal(bills.length, 3);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner3Id, linesLength: 2, lineTitle: 'Test area', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'm2', unitPrice: 15, quantity: 30, localizer: '@A103' });
        assertLineDetails(bills[0].lines[1], { uom: 'm2', unitPrice: 15, quantity: 10, localizer: '@AP01' });
        assertBillDetails(bills[1], { payerPartnerId: payerPartner4Id, linesLength: 1, lineTitle: 'Test area', linePeriod: '2018-01' });
        assertLineDetails(bills[1].lines[0], { uom: 'm2', unitPrice: 15, quantity: 40, localizer: '@A104' });
        assertBillDetails(bills[2], { payerPartnerId: payerPartner2Id, linesLength: 1, lineTitle: 'Test area', linePeriod: '2018-01' });
        assertLineDetails(bills[2].lines[0], { uom: 'm2', unitPrice: 15, quantity: 20, localizer: '@AP02' });
      });

      it('can apply billing to a certain floor', function() {
        Fixture.builder.create('parcelBilling', {
          title: 'Test floor',
          projection: {
            base: 'area',
            unitPrice: 25,
          },
          digit: '3',
          localizer: '@A1',
        });

        applyParcelBillings('2018-01-12');
        const bills = Transactions.find({ communityId, category: 'bill' }, { sort: { serial: 1 } }).fetch();
        const payer3 = Partners.findOne(payerPartner3Id);
        chai.assert.equal(bills.length, 2);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'Test floor', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'm2', unitPrice: 25, quantity: 30, localizer: '@A103' });
        assertBillDetails(bills[1], { payerPartnerId: payerPartner4Id, linesLength: 1, lineTitle: 'Test floor', linePeriod: '2018-01' });
        assertLineDetails(bills[1].lines[0], { uom: 'm2', unitPrice: 25, quantity: 40, localizer: '@A104' });
        chai.assert.equal(payer3.outstanding(undefined, 'member'), 0);

        postParcelBillings('2018-01-12');
        chai.assert.equal(payer3.outstanding(undefined, 'member'), bills[0].amount);
      });

      it('can apply billing to a certain parcel type', function() {
        Fixture.builder.create('parcelBilling', {
          title: 'Test type',
          projection: {
            base: 'area',
            unitPrice: 100,
          },
          digit: '2',
          // localizer: '@',
          type: ['storage'],
        });

        applyParcelBillings('2018-01-12');
        const bills = Transactions.find({ communityId, category: 'bill' }, { sort: { serial: 1 } }).fetch();
        const payer2 = Partners.findOne(payerPartner2Id);
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner2Id, linesLength: 1, lineTitle: 'Test type', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'm2', unitPrice: 100, quantity: 20, localizer: '@AP02' });
        chai.assert.equal(payer2.outstanding(undefined, 'member'), 0);

        postParcelBillings('2018-01-12');
        chai.assert.equal(payer2.outstanding(undefined, 'member'), bills[0].amount);
      });

      it('can apply billing to a certain parcel group', function() {
        Fixture.builder.create('parcelBilling', {
          title: 'Test group',
          projection: {
            base: 'area',
            unitPrice: 100,
          },
          digit: '2',
          // localizer: '@',
          group: 'small',
        });

        applyParcelBillings('2018-01-12');
        const bills = Transactions.find({ communityId, category: 'bill' }, { sort: { serial: 1 } }).fetch();
        const payer2 = Partners.findOne(payerPartner2Id);
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner2Id, linesLength: 1, lineTitle: 'Test group', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'm2', unitPrice: 100, quantity: 20, localizer: '@AP02' });
        chai.assert.equal(payer2.outstanding(undefined, 'member'), 0);

        postParcelBillings('2018-01-12');
        chai.assert.equal(payer2.outstanding(undefined, 'member'), bills[0].amount);
      });

      it('can apply multiple projections', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test volume',
          projection: {
            base: 'volume',
            unitPrice: 50,
          },
          digit: '2',
          localizer: '@A104',
        });
        Fixture.builder.create('parcelBilling', {
          title: 'Test absolute',
          projection: {
            base: 'absolute',
            unitPrice: 1000,
          },
          digit: '4',
          localizer: '@A104',
        });

        applyParcelBillings('2018-01-12');
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner4Id, linesLength: 2, linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { lineTitle: 'Test volume', uom: 'm3', unitPrice: 50, quantity: 120, localizer: '@A104' });
        assertLineDetails(bills[0].lines[1], { lineTitle: 'Test absolute', uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
      });

      it('can apply consumption based billing', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test consumption',
          consumption: {
            service: 'coldWater',
            charges: [{
              uom: 'm3',
              unitPrice: 600,
            }],
          },
          projection: {
            base: 'habitants',
            unitPrice: 5000,
          },
          digit: '3',
          type: ['flat'],
          localizer: '@',
        });

        applyParcelBillings('2018-01-12');
        const parcel4 = Parcels.findOne(Fixture.dummyParcels[4]);
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner4Id, linesLength: 1, lineTitle: 'Test consumption', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'person', unitPrice: 5000, quantity: 4, localizer: '@A104' });
        chai.assert.equal(parcel4.payerPartner().outstanding(undefined, 'member'), 0);

        postParcelBillings('2018-01-12');
        chai.assert.equal(parcel4.payerPartner().outstanding(undefined, 'member'), 5000 * 4);
        chai.assert.equal(parcel4.payerContract().outstanding(), 5000 * 4);
        chai.assert.equal(parcel4.outstanding(), 5000 * 4);

        Transactions.remove({});
        const meteredParcelId = Fixture.dummyParcels[3];
        let meteredParcel = Parcels.findOne(meteredParcelId);
        Fixture.builder.execute(Meters.methods.registerReading, { _id: meteredParcel.meters().fetch()[0]._id, reading: { date: new Date('2018-02-01'), value: 11 } });
        applyParcelBillings('2018-02-12');
        meteredParcel = Parcels.findOne(meteredParcelId);
        const bills2 = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills2.length, 2);
        const billMetered = Transactions.findOne({ category: 'bill', partnerId: meteredParcel.payerPartner()._id });
        assertBillDetails(billMetered, { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'Test consumption', linePeriod: '2018-02' });
        assertLineDetails(billMetered.lines[0], { uom: 'm3', unitPrice: 600, quantity: 14.903, localizer: '@A103' });
        chai.assert.equal(meteredParcel.payerPartner().outstanding(undefined, 'member'), 0);
        chai.assert.equal(meteredParcel.outstanding(), 0);

        postParcelBillings('2018-02-12');
        chai.assert.equal(meteredParcel.payerPartner().outstanding(undefined, 'member'), billMetered.amount);
        chai.assert.equal(meteredParcel.outstanding(), billMetered.amount);
      });

      it('throws error if no data on parcel', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test consumption',
          consumption: {
            service: 'coldWater',
            charges: [{
              uom: 'm3',
              unitPrice: 600,
            }],
          },
          projection: {
            base: 'habitants',
            unitPrice: 5000,
          },
          digit: '3',
          localizer: '@AP01',
        });

        chai.assert.throws(() => applyParcelBillings('2018-01-15'), 'err_invalidData');
      });

      it('bills follower parcel\'s parcel-billing to lead parcel\'s payer', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'One follower parcel',
          projection: {
            base: 'area',
            unitPrice: 15,
          },
          digit: '3',
          localizer: '@AP01',
        });

        applyParcelBillings('2018-01-12');
        const followerParcel = Parcels.findOne(Fixture.dummyParcels[1]);
        const leadParcel = Parcels.findOne(Fixture.dummyParcels[3]);
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'One follower parcel', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'm2', unitPrice: 15, quantity: 10, localizer: '@AP01' });
        chai.assert.equal(bills[0].amount, 150);
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), 0);

        postParcelBillings('2018-01-12');
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), bills[0].lines[0].amount);
        // chai.assert.equal(Balances.get({ communityId, partner: followerParcel.payerPartner()._id, tag: 'T' }).total(), bills[0].lines[0].amount);
        // parcel.payerPartner() can only identify leadParcel's partner, as follower parcel's contract does not have partnerId, only leadParcelId
        chai.assert.equal(leadParcel.outstanding(), 0);
        chai.assert.equal(followerParcel.outstanding(), bills[0].lines[0].amount);
      });

      it("bills follower parcel's consumption based parcel-billing to lead parcel's payer", function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Follower consumption',
          consumption: {
            service: 'coldWater',
            charges: [{
              uom: 'm3',
              unitPrice: 500,
            }],
          },
          digit: '3',
          localizer: '@AP01',
        });
        const meteredParcelId = Fixture.dummyParcels[1];
        const meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-01012',
          service: 'coldWater',
          uom: 'm3',
          activeTime: { begin: new Date('2018-01-01') },
        });
        Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-02-01'), value: 11 } });
        chai.assert.isDefined(Memberships.findOne({ parcelId: Fixture.dummyParcels[1], ownership: { $exists: true } }));

        applyParcelBillings('2018-02-01');
        const followerParcel = Parcels.findOne(Fixture.dummyParcels[1]);
        const leadParcel = Parcels.findOne(Fixture.dummyParcels[3]);
        let bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'Follower consumption', linePeriod: '2018-02' });
        assertLineDetails(bills[0].lines[0], { uom: 'm3', unitPrice: 500, quantity: 11, localizer: '@AP01' });
        chai.assert.equal(bills[0].amount, 5500);
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), 0);

        postParcelBillings('2018-02-01');
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), bills[0].lines[0].amount);
        chai.assert.equal(leadParcel.outstanding(), 0);
        chai.assert.equal(followerParcel.outstanding(), bills[0].lines[0].amount);
        const dummyPartner = Partners.findOne({ userId: Fixture.dummyUsers[1] });
        chai.assert.equal(dummyPartner.outstanding(undefined, 'member'), 0);

        Memberships.remove({ parcelId: Fixture.dummyParcels[1], ownership: { $exists: true } });
        Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-03-01'), value: 21 } });
        applyParcelBillings('2018-03-01');
        bills = Transactions.find({ communityId, category: 'bill' }, { sort: { createdAt: 1 } }).fetch();
        chai.assert.equal(bills.length, 2);
        assertBillDetails(bills[1], { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'Follower consumption', linePeriod: '2018-03' });
        assertLineDetails(bills[1].lines[0], { uom: 'm3', unitPrice: 500, quantity: 10, localizer: '@AP01' });
        chai.assert.equal(bills[1].amount, 5000);
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), 5500);
        postParcelBillings('2018-03-01');
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), 10500);
        chai.assert.equal(leadParcel.outstanding(), 0);
        chai.assert.equal(followerParcel.outstanding(), 10500);
        chai.assert.equal(dummyPartner.outstanding(undefined, 'member'), 0);
      });

      it('bills to follower parcel with lead parcel if withFollowers is checked', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'One for all',
          projection: {
            base: 'area',
            unitPrice: 10,
          },
          digit: '3',
          localizer: '@',
        });
        Fixture.builder.execute(ParcelBillings.methods.apply,
          { communityId, date: new Date('2018-01-10'), localizer: '@A103', withFollowers: true },
          Fixture.builder.getUserWithRole('accountant'));

        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner3Id, linesLength: 2, lineTitle: 'One for all', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'm2', unitPrice: 10, quantity: 30, localizer: '@A103' });
        assertLineDetails(bills[0].lines[1], { uom: 'm2', unitPrice: 10, quantity: 10, localizer: '@AP01' });
        chai.assert.equal(bills[0].amount, 400);

        postParcelBillings('2018-01-10');
        const followerParcel = Parcels.findOne(Fixture.dummyParcels[1]);
        const leadParcel = Parcels.findOne(Fixture.dummyParcels[3]);
        chai.assert.equal(leadParcel.payerPartner().outstanding(undefined, 'member'), 400);
        chai.assert.equal(leadParcel.outstanding(), 300);
        chai.assert.equal(followerParcel.outstanding(), 100);
      });

      it('bills the then owner for given apply date', function () {
        formerMembershipId = Memberships.findOne({ parcelId: Fixture.dummyParcels[3] })._id;
        Memberships.methods.update._execute({ userId: Fixture.demoAdminId },
          { _id: formerMembershipId,
            modifier: { $set: {
              'activeTime.begin': new Date('2017-12-01'),
              'activeTime.end': new Date('2018-02-01') },
            },
          });
        laterMembershipId = Fixture.builder.createMembership(Fixture.dummyUsers[2], 'owner', {
          parcelId: Fixture.dummyParcels[3],
          ownership: { share: new Fraction(1, 1) },
        });
        Memberships.methods.update._execute({ userId: Fixture.demoAdminId }, {
          _id: laterMembershipId, modifier: { $set: {
            'activeTime.begin': new Date('2018-02-01'),
          } },
        });

        Fixture.builder.create('parcelBilling', {
          title: 'Test absolute',
          projection: {
            base: 'absolute',
            unitPrice: 500,
          },
          digit: '4',
          localizer: '@A103',
        });
        const laterpayerPartnerId = Meteor.users.findOne(Fixture.dummyUsers[2]).partnerId(Fixture.demoCommunityId);

        applyParcelBillings('2018-01-12');
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        let parcel = Parcels.findOne(Fixture.dummyParcels[3]);
        let formerPayer = Partners.findOne(payerPartner3Id);
        let laterPayer = Partners.findOne(laterpayerPartnerId);
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'Test absolute', linePeriod: '2018-01' });
        assertLineDetails(bills[0].lines[0], { uom: 'piece', unitPrice: 500, quantity: 1, localizer: '@A103' });
        postParcelBillings('2018-01-12');
        chai.assert.equal(formerPayer.outstanding(undefined, 'member'), bills[0].amount);
        chai.assert.equal(parcel.outstanding(), bills[0].amount);
        chai.assert.equal(laterPayer.outstanding(undefined, 'member'), 0);

        Transactions.remove({});
        applyParcelBillings('2018-03-12');
        const bills2 = Transactions.find({ communityId, category: 'bill' }).fetch();
        parcel = Parcels.findOne(Fixture.dummyParcels[3]);
        formerPayer = Partners.findOne(payerPartner3Id);
        laterPayer = Partners.findOne(laterpayerPartnerId);
        chai.assert.equal(bills2.length, 1);
        assertBillDetails(bills2[0], { payerPartnerId: laterpayerPartnerId, linesLength: 1, lineTitle: 'Test absolute', linePeriod: '2018-03' });
        assertLineDetails(bills2[0].lines[0], { uom: 'piece', unitPrice: 500, quantity: 1, localizer: '@A103' });
        postParcelBillings('2018-03-12');
        chai.assert.equal(laterPayer.outstanding(undefined, 'member'), bills2[0].amount);
        chai.assert.equal(parcel.outstanding(), bills2[0].amount);
        chai.assert.equal(formerPayer.outstanding(undefined, 'member'), 0);

        ParcelBillings.remove({});
        Fixture.builder.create('parcelBilling', {
          title: 'Test area',
          projection: {
            base: 'area',
            unitPrice: 50,
          },
          digit: '3',
          localizer: '@AP01',
        });

        const leadContract = Contracts.findOne({ parcelId: Fixture.dummyParcels[1] });
        Contracts.methods.update._execute({ userId: Fixture.demoAdminId }, {
          _id: leadContract._id, modifier: { $set: {
            'activeTime.begin': new Date('2017-02-01'),
            'activeTime.end': new Date('2019-12-10'),
          } },
        });
        chai.assert.equal(leadContract.leadParcelId, Fixture.dummyParcels[3]);
        chai.assert.isUndefined(Contracts.findOneActive({ parcelId: Fixture.dummyParcels[1] }));

        Transactions.remove({});
        applyParcelBillings('2018-01-12');
        const followerBills = Transactions.find({ communityId, category: 'bill' }).fetch();
        let followerParcel = Parcels.findOne(Fixture.dummyParcels[1]);
        formerPayer = Partners.findOne(payerPartner3Id);
        laterPayer = Partners.findOne(laterpayerPartnerId);
        chai.assert.equal(followerBills.length, 1);
        assertBillDetails(followerBills[0], { payerPartnerId: payerPartner3Id, linesLength: 1, lineTitle: 'Test area', linePeriod: '2018-01' });
        assertLineDetails(followerBills[0].lines[0], { uom: 'm2', unitPrice: 50, quantity: 10, localizer: '@AP01' });
        postParcelBillings('2018-01-12');
        chai.assert.equal(formerPayer.outstanding(undefined, 'member'), followerBills[0].amount);
        chai.assert.equal(followerParcel.outstanding(), followerBills[0].amount);
        chai.assert.equal(laterPayer.outstanding(undefined, 'member'), 0);

        Transactions.remove({});
        applyParcelBillings('2018-03-12');
        const followerBills2 = Transactions.find({ communityId, category: 'bill' }).fetch();
        followerParcel = Parcels.findOne(Fixture.dummyParcels[1]);
        formerPayer = Partners.findOne(payerPartner3Id);
        laterPayer = Partners.findOne(laterpayerPartnerId);
        chai.assert.equal(followerBills2.length, 1);
        assertBillDetails(followerBills2[0], { payerPartnerId: laterpayerPartnerId, linesLength: 1, lineTitle: 'Test area', linePeriod: '2018-03' });
        assertLineDetails(followerBills2[0].lines[0], { uom: 'm2', unitPrice: 50, quantity: 10, localizer: '@AP01' });
        postParcelBillings('2018-03-12');
        chai.assert.equal(laterPayer.outstanding(undefined, 'member'), followerBills2[0].amount);
        chai.assert.equal(followerParcel.outstanding(), followerBills2[0].amount);
        chai.assert.equal(formerPayer.outstanding(undefined, 'member'), 0);
      });

      it('bills the new owner on the day of change', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test absolute',
          projection: {
            base: 'absolute',
            unitPrice: 500,
          },
          digit: '4',
          localizer: '@A103',
        });

        applyParcelBillings('2018-02-01');
        const bills = Transactions.find({ communityId, category: 'bill' }).fetch();
        const parcel = Parcels.findOne(Fixture.dummyParcels[3]);
        const laterpayerPartnerId = Meteor.users.findOne(Fixture.dummyUsers[2]).partnerId(Fixture.demoCommunityId);
        const formerPayer = Partners.findOne(payerPartner3Id);
        const laterPayer = Partners.findOne(laterpayerPartnerId);
        chai.assert.equal(bills.length, 1);
        assertBillDetails(bills[0], { payerPartnerId: laterpayerPartnerId, linesLength: 1, lineTitle: 'Test absolute', linePeriod: '2018-02' });
        assertLineDetails(bills[0].lines[0], { uom: 'piece', unitPrice: 500, quantity: 1, localizer: '@A103' });
        postParcelBillings('2018-02-01');
        chai.assert.equal(laterPayer.outstanding(undefined, 'member'), bills[0].amount);
        chai.assert.equal(parcel.outstanding(), bills[0].amount);
        chai.assert.equal(formerPayer.outstanding(undefined, 'member'), 0);
      });

      xit('will not apply for same period twice', function () {
        Fixture.builder.create('parcelBilling', {
          title: 'Test area',
          projection: {
            base: 'area',
            unitPrice: 78,
          },
          digit: '3',
          localizer: '@',
        });

        applyParcelBillings('2018-01-12');
        chai.assert.throws(() => applyParcelBillings('2018-01-15'), 'err_alreadyExists');
        // but can apply for a different period
        applyParcelBillings('2018-02-10');
      });

      it('Reset original ownership', function () {
        Memberships.methods.remove._execute({ userId: Fixture.demoAdminId }, { _id: laterMembershipId });
        Memberships.methods.update._execute({ userId: Fixture.demoAdminId }, {
          _id: formerMembershipId, modifier: { $unset: {
            'activeTime.begin': '',
            'activeTime.end': '',
          } },
        });
      });
    });

    describe('consumption calculation', function () {
      let parcelBillingId;
      let meteredParcelId;
      let meterId;
      let registerReading;
      let assertBilled;
      let daysWoEstimation;  // days between reading and billing without estimation, see meters.getEstimatedValue())
      before(function () {
        Meters.remove({});
        ParcelBillings.remove({});
        Transactions.remove({});
        daysWoEstimation = 5;

        parcelBillingId = Fixture.builder.create('parcelBilling', {
          title: 'Test consumption',
          consumption: {
            service: 'coldWater',
            charges: [{
              uom: 'm3',
              unitPrice: 600,
            }],
          },
          projection: {
            base: 'habitants',
            unitPrice: 5000,
          },
          digit: '3',
          type: ['flat'],
          localizer: '@',
        });
        meteredParcelId = Fixture.dummyParcels[3];
        const meteredParcel = Parcels.findOne(meteredParcelId);
        meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-01010101',
          service: 'coldWater',
          uom: 'm3',
          activeTime: { begin: new Date('2018-01-22') },
        });
        registerReading = function (date, value) {
          Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date(date), value } });
        };
        const assertedBill = {};
        assertBilled = function (date, projOrCons, quantity) {
          const bills = Transactions.find({ communityId, category: 'bill', 'lines.localizer': '@'+meteredParcel.ref })
            .fetch().filter(b => !assertedBill[b._id]);
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
            assertedBill[bill._id] = true;
            return bill;
          }
        };
      });

      afterEach(function () {
      });

      it('Can bill for before the meter was installed -> charged by projection', function () {
        applyParcelBillings('2018-01-12'); postParcelBillings('2018-01-12');
        assertBilled('2018-01-12', 'projection', 3);
      });

      it('Can bill a fresh meter -> no charge', function () {
        applyParcelBillings('2018-02-12'); postParcelBillings('2018-02-12');
        assertBilled('2018-02-22', 'consumption', 0);
      });

      it('Can bill based on reading', function () {
        registerReading('2018-03-01', 10);
        applyParcelBillings('2018-03-01'); postParcelBillings('2018-03-01');
        assertBilled('2018-03-01', 'consumption', 10);
      });

      it('Doesnt bill again for what it was already billed for', function () {
        applyParcelBillings('2018-03-01'); postParcelBillings('2018-03-01');
        assertBilled('2018-03-01', 'consumption', 0);
      });

      it('When the bill is voided, it will bill for it again', function () {
        revertParcelBillings('2018-03-01'); postParcelBillings('2018-03-01');
        assertBilled('2018-03-01', 'consumption', -10);
        applyParcelBillings('2018-03-01'); postParcelBillings('2018-03-01');
        assertBilled('2018-03-01', 'consumption', 10);
      });

      it('Can bill based on estimating', function () {
        applyParcelBillings('2018-03-25'); postParcelBillings('2018-03-25');
        assertBilled('2018-03-25', 'consumption', 6.316);
      });

      it('Doesnt bill again for what it was already billed for', function () {
        applyParcelBillings('2018-03-25'); postParcelBillings('2018-03-25');
        assertBilled('2018-03-25', 'consumption', 0);
      });

      xit('Cannot accidentally bill for same period twice', function () {
        chai.assert.throws(() => {
          applyParcelBillings('2018-03-24');
        }, 'err_alreadyExists');
        assertBilled('2018-03-24', 'consumption', 0);
      });

      it('Will bill based only on reading for specified elapsed days', function (done) {
        registerReading('2018-03-31', 20);
        if (!daysWoEstimation) done();
        const dd = daysWoEstimation < 10 ? `0${daysWoEstimation}` : daysWoEstimation;
        applyParcelBillings(`2018-04-${dd}`); postParcelBillings(`2018-04-${dd}`);
        assertBilled(`2018-04-${dd}`, 'consumption', 3.684);
        revertParcelBillings(`2018-04-${dd}`); postParcelBillings(`2018-04-${dd}`);
        assertBilled(`2018-04-${dd}`, 'consumption', -3.684);
        done();
      });

      it('Cannot storno a bill for which newer billings are already registered', function () {
        chai.assert.throws(() => {
          revertParcelBillings('2018-03-01');
        }, 'err_notAllowed');
      });

      it('Can bill based on reading and estimation at the same time', function () {
        const days = daysWoEstimation ? daysWoEstimation + 1 : 5;
        const consumption = Math.roundToDecimals((0.33333 * days) + 3.684, 3);
        const dd = days < 10 ? `0${days}` : days;
        applyParcelBillings(`2018-04-${dd}`); postParcelBillings(`2018-04-${dd}`);
        assertBilled(`2018-04-${dd}`, 'consumption', consumption);
      });

      it('Can do refund (bill a negative amount)', function () {
        const billedDays = daysWoEstimation ? daysWoEstimation + 1 : 5;
        const consumption = Math.roundToDecimals(0.3333 * billedDays, 3);
        registerReading('2018-04-25', 20);  // same reading as before - no consumption
        applyParcelBillings('2018-04-25'); postParcelBillings('2018-04-25');
        assertBilled('2018-04-25', 'consumption', -1 * consumption);
      });

      it('Can estimate when no consumption in the flat', function () {
        applyParcelBillings('2018-05-05'); postParcelBillings('2018-05-05');
        assertBilled('2018-05-05', 'consumption', 0);
      });

      it('Can register two meters for the same service concurrently. Also for another service, its OK to have another meter.', function () {
        Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-02020202',
          service: 'coldWater',
          uom: 'l',
          activeTime: { begin: new Date('2018-07-01') },
        });
        Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'HW-02020202',
          service: 'hotWater',
          uom: 'l',
          activeTime: { begin: new Date('2018-07-01') },
        });
      });

      it('Can archive a meter which has no unbilled amount', function () {
        Fixture.builder.execute(Meters.methods.update, { _id: meterId, modifier: { $set: { 'activeTime.end': new Date('2018-06-30') } } });
        chai.assert.isUndefined(Meters.findOneActive(meterId));
      });

      it('Can use a new meter that measures in a different uom', function () {
        meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-02020202',
          service: 'coldWater',
          uom: 'l', // the other one was measuring m3
          activeTime: { begin: new Date('2018-06-30') },
        });
        assertBilled('2018-06-30', 'consumption', 0);
      });

      it('Cannot bill while some meters are in an unsupported uom', function () {
        chai.assert.throws(() => applyParcelBillings('2018-07-30'),
          'err_invalidData');
      });

      it('Can bill in different uom', function () {
        ParcelBillings.update(parcelBillingId, { $push: { 'consumption.charges': { uom: 'l', unitPrice: 600 } } }); 
        // TODO: use a different value than 600, so we see that the correct amount is billed!
        registerReading('2018-07-20', 2);
        applyParcelBillings('2018-07-30'); postParcelBillings('2018-07-30');
        assertBilled('2018-07-30', 'consumption', 3);
      });

      it('Cannot remove a meter which has unbilled amount', function () {
        chai.assert.throws(() => Fixture.builder.execute(Meters.methods.remove, { _id: meterId }),
          'err_unableToRemove');
      });
    });

    describe('late fee calculation', function () {
      let parcelBillingId, parcelBillingIdForAll;
      let lateFeeBillingId0, lateFeeBillingId6, lateFeeBillingId12;
      let getLateFeeLine;

      before(function () {
        ParcelBillings.remove({});
        Transactions.remove({});
        Communities.update(Fixture.demoCommunityId, { $set: { 'settings.latePaymentFees': true } });
  
        parcelBillingIdForAll = Fixture.builder.create('parcelBilling', {
          title: 'Common cost for all',
          projection: {
            base: 'absolute',
            unitPrice: 1000,
          },
          digit: '4',
          localizer: '@',
          activeTime: {
            begin: moment('2018-01-01').toDate(),
            end: moment('2018-03-30').toDate(),
          },
        });
        parcelBillingId = Fixture.builder.create('parcelBilling', {
          title: 'Common cost',
          projection: {
            base: 'absolute',
            unitPrice: 1000,
          },
          digit: '4',
          localizer: '@A104',
          activeTime: {
            begin: moment('2018-04-01').toDate(),
            end: moment('2019-06-30').toDate(),
          },
        });
        // There is no Late Fee defined until 2018-06-31. Then we gradually increase every 6 months
        lateFeeBillingId0 = Fixture.builder.create('parcelBilling', {
          title: 'Late Fee 0',
          projection: {
            base: 'YAL',
            unitPrice: 0,
          },
          digit: '6',
          localizer: '@',
          activeTime: {
            begin: moment('2018-06-01').toDate(),
            end: moment('2018-12-31').toDate(),
          },
        });
        lateFeeBillingId6 = Fixture.builder.create('parcelBilling', {
          title: 'Late Fee 6',
          projection: {
            base: 'YAL',
            unitPrice: 6,
          },
          digit: '6',
          localizer: '@A104',
          activeTime: {
            begin: moment('2019-01-01').toDate(),
            end: moment('2019-06-30').toDate(),
          },
        });
        lateFeeBillingId12 = Fixture.builder.create('parcelBilling', {
          title: 'Late Fee 12',
          projection: {
            base: 'YAL',
            unitPrice: 12,
          },
          digit: '6',
          localizer: '@A104',
          activeTime: {
            begin: moment('2019-07-01').toDate(),
            end: moment('2019-12-31').toDate(),
          },
        });
      });

      afterEach(function () {
      });

      it('No bills mean no late fees', function () {
        applyParcelBillings('2018-03-01'); postParcelBillings('2018-03-01');
        const billsNoLP = Transactions.find({ category: 'bill', partnerId: payerPartner2Id }).fetch();
        chai.assert.equal(billsNoLP.count(), 1);
        assertBillDetails(billsNoLP[0], { payerPartnerId: payerPartner2Id, linesLength: 1, linePeriod: '2018-03' });
        assertLineDetails(billsNoLP[0].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@AP02' });
        chai.assert.equal(billsNoLP[0].lateValueBilled, undefined);
        chai.assert.equal(billsNoLP[0].lateValueOutstanding, undefined);
        const bills = Transactions.find({ category: 'bill' , partnerId: payerPartner4Id }).fetch();
        chai.assert.equal(bills.count(), 1);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-03' });
        assertLineDetails(bills[0].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        chai.assert.equal(bills[0].lateValueBilled, undefined);
        chai.assert.equal(bills[0].lateValueOutstanding, undefined);
      });

      it('Without active Late Fee Billing, no late fees', function () {
        applyParcelBillings('2018-05-01'); postParcelBillings('2018-05-01');
        const billsNoLP = Transactions.find({ category: 'bill', partnerId: payerPartner2Id }).fetch();
        chai.assert.equal(billsNoLP.count(), 1);  // no change
        const bills = Transactions.find({ category: 'bill',  partnerId: payerPartner4Id }).fetch();
        chai.assert.equal(bills.count(), 2);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-03' });
        assertLineDetails(bills[0].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertBillDetails(bills[1], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-05'  });
        assertLineDetails(bills[1].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        chai.assert.equal(bills[0].lateValueBilled, undefined);
        chai.assert.equal(bills[0].lateValueOutstanding, undefined);
        chai.assert.equal(bills[1].lateValueBilled, undefined);
        chai.assert.equal(bills[1].lateValueOutstanding, undefined);
      });

      it('ZERO Late Fee Billing induces ZERO late fee lines', function () {
        applyParcelBillings('2018-07-01'); postParcelBillings('2018-07-01');
        const billsNoLP = Transactions.find({ category: 'bill', partnerId: payerPartner2Id }).fetch();
        chai.assert.equal(billsNoLP.count(), 2); 
        assertBillDetails(billsNoLP[0], { payerPartnerId: payerPartner2Id, linesLength: 1, linePeriod: '2018-03' });
        assertLineDetails(billsNoLP[0].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@AP02' });
        chai.assert.equal(billsNoLP[0].lateValueBilled, 1000 * 108);
        chai.assert.equal(billsNoLP[0].lateValueOutstanding, undefined);
        assertBillDetails(billsNoLP[1], { payerPartnerId: payerPartner2Id, linesLength: 1, linePeriod: '2018-07' });
        assertLineDetails(billsNoLP[1].lines[0], { uom: '%', unitPrice: 0, quantity: 2.96, localizer: undefined });
        chai.assert.equal(billsNoLP[1].lateValueBilled, undefined);
        chai.assert.equal(billsNoLP[1].lateValueOutstanding, undefined);
        const bills = Transactions.find({ category: 'bill', partnerId: payerPartner4Id }).fetch();
        chai.assert.equal(bills.count(), 3);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-03' });
        assertLineDetails(bills[0].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertBillDetails(bills[1], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-05'  });
        assertLineDetails(bills[1].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertBillDetails(bills[2], { payerPartnerId: payerPartner4Id, linesLength: 3, linePeriod: '2018-07' });
        assertLineDetails(bills[2].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertLineDetails(bills[2].lines[1], { uom: '%', unitPrice: 0, quantity: 2.96, localizer: undefined });
        assertLineDetails(bills[2].lines[2], { uom: '%', unitPrice: 0, quantity: 1.29, localizer: undefined });
        chai.assert.equal(bills[0].lateValueBilled, 1000 * 108);
        chai.assert.equal(bills[0].calculateLateValueOutstanding('2018-07-01'), 0);
        chai.assert.equal(bills[0].calculateLateValueOutstanding('2018-07-02'), 1000);
        chai.assert.equal(bills[1].lateValueBilled, 1000 * 47);
        chai.assert.equal(bills[1].calculateLateValueOutstanding('2018-07-01'), 0);
        chai.assert.equal(bills[1].calculateLateValueOutstanding('2018-07-02'), 1000);
        chai.assert.equal(bills[2].lateValueBilled, undefined);
        chai.assert.equal(bills[2].lateValueOutstanding, undefined);

        const lateFeeBilling0 = ParcelBillings.findOne(lateFeeBillingId0);
        chai.assert.equalDate(lateFeeBilling0.lastAppliedAt().date, new Date('2018-07-01'));
      });

      it('6% Late Fee Billing induces 6% late fee lines', function () {
        applyParcelBillings('2019-02-01'); postParcelBillings('2019-02-01');
        const nextDay = '2019-02-02';

        const billsNoLP = Transactions.find({ category: 'bill', partnerId: payerPartner2Id }).fetch();
        chai.assert.equal(billsNoLP.count(), 2); // no change, because 6% Late Fees are only applied to '@A104'
        const bills = Transactions.find({ category: 'bill', partnerId: payerPartner4Id }).fetch();
        chai.assert.equal(bills.count(), 4);
        assertBillDetails(bills[0], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-03' });
        assertLineDetails(bills[0].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertBillDetails(bills[1], { payerPartnerId: payerPartner4Id, linesLength: 1, linePeriod: '2018-05'  });
        assertLineDetails(bills[1].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertBillDetails(bills[2], { payerPartnerId: payerPartner4Id, linesLength: 3, linePeriod: '2018-07' });
        assertLineDetails(bills[2].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertLineDetails(bills[2].lines[1], { uom: '%', unitPrice: 0, quantity: 2.96, localizer: undefined });
        assertLineDetails(bills[2].lines[2], { uom: '%', unitPrice: 0, quantity: 1.29, localizer: undefined });
        assertBillDetails(bills[3], { payerPartnerId: payerPartner4Id, linesLength: 4, linePeriod: '2019-02' });
        assertLineDetails(bills[3].lines[0], { uom: 'piece', unitPrice: 1000, quantity: 1, localizer: '@A104' });
        assertLineDetails(bills[3].lines[1], { uom: '%', unitPrice: 6, quantity: 8.85 - 2.96, localizer: undefined });
        assertLineDetails(bills[3].lines[2], { uom: '%', unitPrice: 6, quantity: 7.18 - 1.29, localizer: undefined });
        assertLineDetails(bills[3].lines[3], { uom: '%', unitPrice: 6, quantity: 5.51, localizer: undefined });
        chai.assert.equal(bills[3].amount, 1103.74);
        chai.assert.equal(bills[0].lateValueBilled, 1000 * 323);
        chai.assert.equal(bills[0].currentLateness(nextDay).lateValue, 1000 * (323 + 1));
        chai.assert.equal(bills[0].currentLateness(nextDay).lateValueBilled, 1000 * 323);
        chai.assert.equal(bills[0].calculateLateValueOutstanding(nextDay), 1000 * 1);
        chai.assert.equal(bills[0].lateValueOutstanding, undefined);
        chai.assert.equal(bills[1].lateValueBilled, 1000 * 262);
        chai.assert.equal(bills[1].currentLateness(nextDay).lateValue, 1000 * (262 + 1));
        chai.assert.equal(bills[1].currentLateness(nextDay).lateValueBilled, 1000 * 262);
        chai.assert.equal(bills[1].calculateLateValueOutstanding(nextDay), 1000 * 1);
        chai.assert.equal(bills[1].lateValueOutstanding, undefined);
        chai.assert.equal(bills[2].lateValueBilled, 1000 * 201);
        chai.assert.equal(bills[2].calculateLateValueOutstanding(nextDay), 1000 * 1);
        chai.assert.equal(bills[2].lateValueOutstanding, undefined);
        chai.assert.equal(bills[3].lateValueBilled, undefined);
        chai.assert.equal(bills[3].lateValueOutstanding, undefined);

        const lateFeeBilling6 = ParcelBillings.findOne(lateFeeBillingId6);
        chai.assert.equalDate(lateFeeBilling6.lastAppliedAt().date, new Date('2019-02-01'));
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
          digit: '5',
          localizer: '@',
          notes: 'Test volume',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ notes: 'Test volume' });
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
          digit: '6',
          localizer: '@',
          notes: 'Test habitants',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ notes: 'Test habitants' });
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
          digit: '4',
          localizer: '@',
          notes: 'one area is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ notes: 'one area is missing'});
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
          digit: '4',
          localizer: '@',
          notes: 'one volume is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ notes: 'one volume is missing'});
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
          digit: '1',
          localizer: '@',
          notes: 'one habitant is missing',
        });
        const testParcelBilling = ParcelBillings.findOne(parcelBillingId);
        const transaction = Transactions.findOne({ notes: 'one habitant is missing'});
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
          digit: '3',
          localizer: '@',
          notes: 'no parcel details',
        });
        const testParcelBilling = ParcelBillings.findOne({ notes: 'no parcel details' });
        Parcels.find({ communityId: Fixture.demoCommunityId }).count();
        const parcelNumber = Parcels.find({ communityId: Fixture.demoCommunityId }).count();
        const debitLegs = Transactions.findOne({ notes: 'no parcel details'}).debit.length;
        chai.assert.equal(parcelNumber, debitLegs);
      });

    });
  */
  });
}
