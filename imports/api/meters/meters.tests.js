/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { moment } from 'meteor/momentjs:moment';
import { Clock } from '/imports/utils/clock.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Meters } from '/imports/api/meters/meters.js';

if (Meteor.isServer) {
  let Fixture;

  describe('meters', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });
    after(function () {
    });

    describe('api', function () {
      let meteredParcelId;
      let meterId;
      let registerReading;
      let assertEstimate;
      before(function () {
        meteredParcelId = Fixture.dummyParcels[0];
        meterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-01010101',
          service: 'coldWater',
          activeTime: { begin: new Date('2018-03-03') },
        });
//        const communityId = Fixture.demoCommunityId;

        registerReading = function (date, value) {
          Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date(date), value } });
        };
        assertEstimate = function (date, value) {
          const meteredParcel = Parcels.findOne(meteredParcelId);
          chai.assert.equal(meteredParcel.getEstimate(new Date(date)), value);
        };
      });

      afterEach(function () {
      });
      
      it('Can create new meter - starts with 0', function () {
        const meter = Meters.findOne(meterId);
        chai.assert.deepEqual(meter.lastReading(), { date: new Date('2018-03-03'), value: 0, approved: true });
      });

      it('Will not estimate before any readings', function () {
        const meter = Meters.findOne(meterId);
        chai.assert.equal(meter.getEstimate(new Date('2018-04-04')), 0);
      });

      it('Can register reading', function () {
        Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-05-05'), value: 10 } });
        const meter = Meters.findOne(meterId);
        chai.assert.deepEqual(meter.lastReading(), { date: new Date('2018-05-05'), value: 10, approved: false });
      });

      it('Can estimate after 1 reading', function () {
        const meter = Meters.findOne(meterId);
        const usageDays = moment('2018-05-05').diff(moment('2018-03-03'), 'days');
        const elapsedDays = moment('2018-06-15').diff(moment('2018-05-05'), 'days');
        const estimate = (10 / usageDays) * elapsedDays;
        chai.assert.equal(meter.getEstimate(new Date('2018-06-15')), estimate);
      });

      it('Can not register earlier than last reading', function () {
        chai.assert.throws(() => {
          Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-04-01'), value: 15 } });
        }, 'err_notAllowed');
      });

      it('Can not register lower than last reading', function () {
        chai.assert.throws(() => {
          Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-04-01'), value: 10 } });
        }, 'err_notAllowed');
      });

      it('Can register more reading', function () {
        Fixture.builder.execute(Meters.methods.registerReading, { _id: meterId, reading: { date: new Date('2018-06-06'), value: 15 } });
        const meter = Meters.findOne(meterId);
        chai.assert.deepEqual(meter.lastReading(), { date: new Date('2018-06-06'), value: 15, approved: false });
      });

      it('Can estimate after 2 reading', function () {
        const meter = Meters.findOne(meterId);
        const usageDays = moment('2018-06-06').diff(moment('2018-05-05'), 'days');
        const elapsedDays = moment('2018-06-30').diff(moment('2018-06-06'), 'days');
        const estimate = (5 / usageDays) * elapsedDays;
        chai.assert.equal(meter.getEstimate(new Date('2018-06-30')), estimate);
      });

      it('Can create new meter /without activeTime - and it starts with 0 at currentDate', function () {
        Clock.setSimulatedTime(new Date());
        const newMeterId = Fixture.builder.create('meter', {
          parcelId: meteredParcelId,
          identifier: 'CW-02020202',
          service: 'coldWater',
        });
        const newMeter = Meters.findOne(newMeterId);
        chai.assert.deepEqual(newMeter.lastReading(), { date: Clock.currentTime(), value: 0, approved: true });
      });
    });
  });
}
