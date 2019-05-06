/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { freshFixture } from '/imports/api/test-utils.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { insert as insertMembership, update as updateMembership } from '/imports/api/memberships/methods.js';

if (Meteor.isServer) {

  import '/imports/api/memberships/publications.js';

  let Fixture;

  describe('active-period', function () {

    this.timeout(5000);
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
        person: { userId: Fixture.demoUserId },
        role: 'manager',
      };
      if (beginDate || endDate) newMembership.activeTime = {};
      if (beginDate) newMembership.activeTime.begin = beginDate;
      if (endDate) newMembership.activeTime.end = endDate;
      return newMembership;
    };

    const updateMembershipModifier = function (beginDate, endDate) {
      const modifier = {};
      if (beginDate) modifier['activeTime.begin'] = beginDate;
      if (endDate) modifier['activeTime.end'] = endDate;
      return modifier;
    };


    it('right active value after insert/update', function (done) {

      const now = moment().toDate();
      const past = moment().subtract(1, 'weeks').toDate();
      const past2 = moment().subtract(2, 'weeks').toDate();
      const future = moment().add(1, 'weeks').toDate();

      // inserts

      chai.assert.throws(() => {
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(future, undefined));
      });

      chai.assert.throws(() => {
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, now));
      });

      chai.assert.throws(() => {
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, future));
      });

      chai.assert.throws(() => {
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, past));
      });

      chai.assert.throws(() => {
        insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(now, future));
      });

      testMembershipId = insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(undefined, undefined));
      let testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      testMembershipId2 = insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(now, undefined));
      const testMembership2 = Memberships.findOne(testMembershipId2);
      chai.assert.equal(testMembership2.active, true);

      testMembershipId3 = insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(past, undefined));
      const testMembership3 = Memberships.findOne(testMembershipId3);
      chai.assert.equal(testMembership3.active, true);

      testMembershipId4 = insertMembership._execute({ userId: Fixture.demoAdminId }, createMembership(past2, past));
      const testMembership4 = Memberships.findOne(testMembershipId4);
      chai.assert.equal(testMembership4.active, false);

      // updates

      chai.assert.throws(() => {
        updateMembership._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: { $set: updateMembershipModifier(future, undefined) } });
      });

      chai.assert.throws(() => {
        updateMembership._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: { $set: updateMembershipModifier(undefined, now) } });
      });

      chai.assert.throws(() => {
        updateMembership._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: { $set: updateMembershipModifier(undefined, future) } });
      });

      chai.assert.throws(() => {
        updateMembership._execute({ userId: Fixture.demoAdminId },
        { _id: testMembershipId, modifier: { $set: updateMembershipModifier(undefined, past) } });
      });

      updateMembership._execute({ userId: Fixture.demoAdminId },
      { _id: testMembershipId, modifier: { $set: updateMembershipModifier(undefined, undefined) } });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      updateMembership._execute({ userId: Fixture.demoAdminId },
      { _id: testMembershipId, modifier: { $set: updateMembershipModifier(now, undefined) } });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      updateMembership._execute({ userId: Fixture.demoAdminId },
      { _id: testMembershipId, modifier: { $set: updateMembershipModifier(past, undefined) } });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, true);

      updateMembership._execute({ userId: Fixture.demoAdminId },
      { _id: testMembershipId, modifier: { $set: updateMembershipModifier(past2, past) } });
      testMembership = Memberships.findOne(testMembershipId);
      chai.assert.equal(testMembership.active, false);

      done();
    });
  });
}
