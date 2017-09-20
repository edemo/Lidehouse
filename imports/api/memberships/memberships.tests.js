/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { insert as insertMembership, update as updateMembership, remove as removeMembership  } from '/imports/api/memberships/methods.js';
import { everybody } from '/imports/api/permissions/config.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('memberships', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {

      it('sends all memberships.inCommunity', function (done) {
        const collector = new PublicationCollector();
        collector.collect(
          'memberships.inCommunity',
          { communityId: Fixture.demoCommunityId },
          (collections) => {
            chai.assert.equal(collections.memberships.length, 11);
            chai.assert.equal(collections.parcels.length, 5);
            done();
          }
        );
      });

      it('sends all memberships.ofUser', function (done) {
        const collector = new PublicationCollector();
        collector.collect(
          'memberships.ofUser',
          { userId: Fixture.demoUserId },
          (collections) => {
            chai.assert.equal(collections.memberships.length, 2);
            chai.assert.equal(collections.communities.length, 1);
            done();
          }
        );
      });
    });

    describe('permissions', function () {
      let testMembershipId;
      const randomRole = _.sample(everybody);
      const createMembership = function (newrole) {
        const newMembership = {
          communityId: Fixture.demoCommunityId,
          userId: Fixture.demoUserId,
          role: newrole,
        };
        if (newrole === 'owner') {
          _.extend(newMembership, {
            parcelId: Parcels.insert({ communityId: Fixture.demoCommunityId, serial: 45, units: 0 }),
            ownership: { share: new Fraction(1, 1) },
          });
        }
        return newMembership;
      };

      it('admin can add/update/remove member', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoAdminId }, 
          createMembership(randomRole));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, randomRole);
        chai.assert.deepEqual(Memberships.find().count(), 12);
        updateMembership._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId, modifier: { $set: { role: 'treasurer' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'treasurer');
        removeMembership._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId });
        chai.assert.deepEqual(Memberships.find().count(), 11);
        done();
      });

      it('owner can only add/update?/remove tenant', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoUserId }, 
          createMembership('tenant'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'tenant');
        updateMembership._execute({ userId: Fixture.demoUserId },
          { _id: testMembershipId, modifier: { $set: { role: 'tenant' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'tenant');
        chai.assert.throws(() => {
          updateMembership._execute({ userId: Fixture.demoUserId }, 
            { _id: testMembershipId, modifier: { $set: { role: 'manager' } } });
        });
        chai.assert.throws(() => {
          insertMembership._execute({ userId: Fixture.demoUserId }, createMembership('manager'));
        });
        removeMembership._execute({ userId: Fixture.demoUserId },{ _id: testMembershipId });
        chai.assert.deepEqual(Memberships.find().count(), 11);
        done();
      });

      it('manager can only add/update?/remove owner', function (done) {
        testMembershipId = insertMembership._execute({ userId: Fixture.demoManagerId }, 
          createMembership('owner'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'owner');
        updateMembership._execute({ userId: Fixture.demoManagerId },
          { _id: testMembershipId, modifier: { $set: { role: 'owner' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'owner');
        chai.assert.throws(() => {
          updateMembership._execute({ userId: Fixture.demoManagerId }, 
            { _id: testMembershipId, modifier: { $set: { role: 'manager' } } });
        });
        chai.assert.throws(() => {
          insertMembership._execute({ userId: Fixture.demoManagerId }, createMembership('manager'));
        });
        removeMembership._execute({ userId: Fixture.demoManagerId },{ _id: testMembershipId });
        chai.assert.deepEqual(Memberships.find().count(), 11);
        done();
      });
    });
  });
};