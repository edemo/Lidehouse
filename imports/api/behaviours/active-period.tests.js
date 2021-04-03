/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';
import { Factory } from 'meteor/dburles:factory';

import { freshFixture } from '/imports/api/test-utils.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { ActiveTimeMachine } from './active-time-machine';

if (Meteor.isServer) {

  import '/imports/api/memberships/publications.js';

  let Fixture;

  describe('active-period', function () {

    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    let testMembershipId;
    let testMembershipId2;
    let testMembershipId3;
    let testMembershipId4;

    const createMembership = function (beginDate, endDate) {
      const newMembership = {
        communityId: Fixture.demoCommunityId,
        userId: Fixture.demoUserId,
        role: 'manager',
      };
      if (beginDate || endDate) newMembership.activeTime = {};
      if (beginDate) newMembership.activeTime.begin = beginDate;
      if (endDate) newMembership.activeTime.end = endDate;
      return newMembership;
    };

    const updateMembershipModifier = function (beginDate, endDate) {
      const modifier = { $set: {}, $unset: {} };
      if (beginDate) modifier.$set['activeTime.begin'] = beginDate;
      else modifier.$unset['activeTime.begin'] = false;
      if (endDate) modifier.$set['activeTime.end'] = endDate;
      else modifier.$unset['activeTime.end'] = false;
      return modifier;
    };

    it('calculates right active value after insert/update', function (done) {

      const now = moment().toDate();
      const past = moment().subtract(1, 'weeks').toDate();
      const past2 = moment().subtract(2, 'weeks').toDate();
      const future = moment().add(1, 'weeks').toDate();

       // inserts

      chai.assert.throws(() => {
        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(future, undefined));
      }, 'validation-error');

      chai.assert.throws(() => {
        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, now));
      }, 'validation-error');

      chai.assert.throws(() => {
        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, future));
      }, 'validation-error');

      chai.assert.throws(() => {
        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, past));
      }, 'validation-error');

      chai.assert.throws(() => {
        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(now, future));
      }, 'validation-error');

      testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, undefined));
      let testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      testMembershipId2 = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(now, undefined));
      const testMembership2 = Memberships.findOne(testMembershipId2);
      chai.assert.equal(testMembership2.active, true);

      testMembershipId3 = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(past, undefined));
      const testMembership3 = Memberships.findOne(testMembershipId3);
      chai.assert.equal(testMembership3.active, true);

      testMembershipId4 = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership(past2, past));
      const testMembership4 = Memberships.findOne(testMembershipId4);
      chai.assert.equal(testMembership4.active, false);

      // updates

      chai.assert.throws(() => {
        Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(future, undefined) });
      }, 'is not an allowed value');

      chai.assert.throws(() => {
        Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(undefined, now) });
      }, 'required');

      chai.assert.throws(() => {
        Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(undefined, future) });
      }, 'is not an allowed value');

      chai.assert.throws(() => {
        Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(undefined, past) });
      }, 'required');

      Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(undefined, undefined) });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(now, undefined) });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(past, undefined) });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: updateMembershipModifier(past2, past) });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, false);

      done();
    });

    it('doesn\'t allow changing non active-period fields', function (done) {
      // it('doesnt update active value, when nothing relevant is touched', function (done) {
      chai.assert.throws(() =>
        Memberships.methods.updateActivePeriod._execute({ userId: Fixture.demoAdminId }, { _id: testMembershipId, modifier: { $set: { accepted: true } } })
      );

      done();
    });

    it('can find things in a past time', function (done) {
      ActiveTimeMachine.runAtTime(moment().subtract(10, 'days').toDate(), () => {
        chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId }));
        chai.assert.isUndefined(Memberships.findOneActive({ _id: testMembershipId2 }));
        chai.assert.isUndefined(Memberships.findOneActive({ _id: testMembershipId3 }));
        chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId4 }));
      });

      // By default everything runs at time NOW
      chai.assert.isUndefined(Memberships.findOneActive({ _id: testMembershipId }));
      chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId2 }));
      chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId3 }));
      chai.assert.isUndefined(Memberships.findOneActive({ _id: testMembershipId4 }));

      ActiveTimeMachine.runDisabled(() => {
        chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId }));
        chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId2 }));
        chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId3 }));
        chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId4 }));
      });

      // By default everything runs at time NOW
      chai.assert.isUndefined(Memberships.findOneActive({ _id: testMembershipId }));
      chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId2 }));
      chai.assert.isDefined(Memberships.findOneActive({ _id: testMembershipId3 }));
      chai.assert.isUndefined(Memberships.findOneActive({ _id: testMembershipId4 }));

      done();
    });

  });
}
