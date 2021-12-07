/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { everyRole, exceptAdmin, defaultRoles } from '/imports/api/permissions/roles.js';
import { Parcels } from '/imports/api/parcels/parcels.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('memberships', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {

      xit('sends all memberships.inCommunity', function (done) {
        const collector = new PublicationCollector({ userId: Fixture.demoUserId });
        collector.collect(
          'memberships.inCommunity',
          { communityId: Fixture.demoCommunityId },
          (collections) => {
            chai.assert.equal(collections.memberships.length, defaultRoles.length + 10);
            chai.assert.equal(collections.parcels.length, 5);
            done();
          }
        );
      });

      it('sends all memberships.ofSelf', function (done) {
        const userWithMultipleParcels = Fixture.dummyUsers[3];
        const collector = new PublicationCollector({ userId: userWithMultipleParcels });
        collector.collect(
          'memberships.ofSelf',
          (collections) => {
            chai.assert.equal(collections.memberships.length, 3);
            chai.assert.equal(collections.communities.length, 2);
            done();
          }
        );
      });
    });

    describe('representor', function () {
      let parcelId;
      let ownership10d, ownership1Id, ownership2Id, ownership3Id, benefactorship1Id;
      beforeEach(function () {
        parcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, category: '@property', ref: '45', units: 0 });
        ownership0Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          activeTime: {  // this is the previous owner
            begin: moment().subtract(1, 'weeks').toDate(),
            end: moment().subtract(1, 'days').toDate(),
          },
          userId: Fixture.dummyUsers[3],
          role: 'owner',
          ownership: { share: new Fraction(1), representor: true },
        });
        ownership1Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[1],
          role: 'owner',
          ownership: { share: new Fraction(1, 4), representor: false },
        });
        ownership2Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[2],
          role: 'owner',
          ownership: { share: new Fraction(1, 4), representor: true },
        });
        ownership3Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[3],
          role: 'owner',
          ownership: { share: new Fraction(1, 4) },
        });
        benefactorship1Id = Memberships.insert({
          communityId: Fixture.demoCommunityId,
          parcelId,
          userId: Fixture.dummyUsers[1],
          role: 'benefactor',
          benefactorship: { type: 'favor' },
        });
      });
      afterEach(function () {
        Parcels.remove(parcelId);
      });

      it('selects flagged representor when specified', function (done) {
        const parcel = Parcels.findOne(parcelId);
        chai.assert.equal(parcel.representor()._id, ownership2Id);
        done();
      });

      // it('selects first owner as representor when not specified', function (done) {
      it('selects no representor when not specified', function (done) {
        Memberships.update(ownership2Id, { $set: { 'ownership.representor': false } }, { selector: { role: 'owner' } });

        const parcel = Parcels.findOne(parcelId);
        // chai.assert.equal(parcel.representor()._id, ownership1Id);
        chai.assert.isUndefined(parcel.representor());
        done();
      });

      it('a parcel should have maximum one representor', function (done) {
        chai.assert.throws(() =>
          Memberships.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: ownership1Id,
            modifier: { $set: { 'ownership.representor': true } },
          }), 'err_sanityCheckFailed'
        );
        done();
      });

      /*
      it('selects first benefactor as representor when no owner', function (done) {
        let parcel;

        Memberships.remove(ownership1Id);
        parcel = Parcels.findOne(parcelId);
        chai.assert.equal(parcel.representor()._id, ownership2Id);

        Memberships.remove(ownership2Id);
        parcel = Parcels.findOne(parcelId);
        chai.assert.equal(parcel.representor()._id, ownership3Id);
        done();

        Memberships.remove(ownership3Id);
        parcel = Parcels.findOne(parcelId);
        chai.assert.equal(parcel.representor()._id, benefactorship1Id);
      });
      

      it('if no owner & benefactor, representor is undefined', function (done) {
        Memberships.remove(benefactorship1Id);
        parcel = Parcels.findOne(parcelId);
        chai.assert.isUndefined(parcel.representor());
        done();
      });
      */
    });

    describe('permissions', function () {
      let testMembershipId;
      const randomRole = _.sample(exceptAdmin);
      const createMembership = function (newrole) {
        const newMembership = {
          communityId: Fixture.demoCommunityId,
          userId: Fixture.demoUserId,
          role: newrole,
        };
        if (newrole === 'owner' || newrole === 'benefactor') {
          _.extend(newMembership, {
            parcelId: Parcels.insert({ communityId: Fixture.demoCommunityId, category: '@property', ref: '45', units: 0 }),
          });
        }
        if (newrole === 'owner') {
          _.extend(newMembership, {
            ownership: { share: new Fraction(1, 1) },
          });
        }
        if (newrole === 'benefactor') {
          _.extend(newMembership, {
            benefactorship: { type: 'rental' },
          });
        }
        return newMembership;
      };

      it('admin can add/update/remove any member', function (done) {
        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId },
          createMembership(randomRole));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isDefined(testMembership);
        chai.assert.equal(testMembership.role, randomRole);

        Memberships.methods.update._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId, modifier: { $set: { 'activeTime.begin': new Date() } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.active, true);

        Memberships.methods.remove._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isUndefined(testMembership);

        done();
      });

      it('admin can add/update/remove other admin, but cannot remove the last admin', function (done) {
        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId },
          createMembership('admin'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isDefined(testMembership);
        chai.assert.equal(testMembership.role, 'admin');

        Memberships.methods.update._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId, modifier: { $set: { 'activeTime.begin': moment().subtract(1, 'months').toDate(), 'activeTime.end': new Date() } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.active, false);

        const demoAdminMembership = Memberships.findOne({ userId: Fixture.demoAdminId });
        chai.assert.throws(() => {
          // Unable to remove himself, as he is the last active admin
          Memberships.methods.remove._execute({ userId: Fixture.demoAdminId },
            { _id: demoAdminMembership._id });
        }, 'err_unableToRemove');

        done();
      });

      xit('owner can only add/update/remove benefactor', function (done) {
        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoUserId }, createMembership('benefactor'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'benefactor');

        chai.assert.throws(() => {
          Memberships.methods.insert._execute({ userId: Fixture.demoUserId }, createMembership('manager'));
        }, 'err_permissionDenied');
        chai.assert.throws(() => {
          Memberships.methods.insert._execute({ userId: Fixture.demoUserId }, createMembership('owner'));
        }, 'err_permissionDenied');

        Memberships.methods.update._execute({ userId: Fixture.demoUserId },
          { _id: testMembershipId, modifier: { $set: { 'benefactorship.type': 'favor' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.benefactorship.type, 'favor');
        chai.assert.throws(() => {
          Memberships.methods.update._execute({ userId: Fixture.demoUserId },
            { _id: testMembershipId, modifier: { $set: { role: 'manager' } } });
        }, 'err_permissionDenied');
        chai.assert.throws(() => {
          Memberships.methods.update._execute({ userId: Fixture.demoUserId },
            { _id: testMembershipId, modifier: { $set: { role: 'owner' } } });
        }, 'err_permissionDenied');

        Memberships.methods.remove._execute({ userId: Fixture.demoUserId }, { _id: testMembershipId });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isUndefined(testMembership);
        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership('owner'));
        chai.assert.throws(() => {
          Memberships.methods.remove._execute({ userId: Fixture.demoUserId }, { _id: testMembershipId });
        }, 'err_permissionDenied');
        done();
      });

      xit('manager can only add/update/remove owner & benefactor', function (done) {
        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId },
          createMembership('owner'));
        chai.assert.isDefined(testMembershipId);
        let testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'owner');
        chai.assert.throws(() => {
          Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, createMembership('manager'));
        }, 'err_permissionDenied');

        Memberships.methods.update._execute({ userId: Fixture.demoManagerId },
          { _id: testMembershipId, modifier: { $set: { role: 'benefactor' } } });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.equal(testMembership.role, 'benefactor');
        chai.assert.throws(() => {
          Memberships.methods.update._execute({ userId: Fixture.demoManagerId },
            { _id: testMembershipId, modifier: { $set: { role: 'manager' } } });
        }, 'err_permissionDenied');

        Memberships.methods.remove._execute({ userId: Fixture.demoManagerId }, { _id: testMembershipId });
        testMembership = Memberships.findOne(testMembershipId);
        chai.assert.isUndefined(testMembership);
        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembership('manager'));
        chai.assert.throws(() => {
          Memberships.methods.remove._execute({ userId: Fixture.demoManagerId }, { _id: testMembershipId });
        }, 'err_permissionDenied');
        done();
      });
    });

    describe('sanity', function () {
      const createMembershipWithShare = function (parcelId, share) {
        const newMembership = {
          communityId: Fixture.demoCommunityId,
          userId: Fixture.demoUserId,
          role: 'owner',
          parcelId,
          ownership: { share },
        };
        return newMembership;
      };
      let testMembershipId;

      it('total ownership shares cannot exceed 1', function (done) {
        const testParcelId = Parcels.insert({ communityId: Fixture.demoCommunityId, category: '@property', ref: '45', units: 0 });
  
        chai.assert.throws(() => {
          Memberships.methods.insert._execute({ userId: Fixture.demoAdminId },
            createMembershipWithShare(testParcelId, new Fraction(2, 1)));
        }, 'err_sanityCheckFailed');
        let testParcel = Parcels.findOne(testParcelId);
        chai.assert.equal(testParcel.ownedShare(), 0);

        testMembershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId },
          createMembershipWithShare(testParcelId, new Fraction(2, 3)));
        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembershipWithShare(testParcelId, new Fraction(1, 3)));
        testParcel = Parcels.findOne(testParcelId);
        chai.assert.equal(testParcel.ownedShare(), 1);
        chai.assert.throws(() => {
          Memberships.methods.insert._execute({ userId: Fixture.demoAdminId },
            createMembershipWithShare(testParcelId, new Fraction(1, 16)));
        }, 'err_sanityCheckFailed');

        Memberships.methods.update._execute({ userId: Fixture.demoAdminId },
          { _id: testMembershipId, modifier: { $set: { 'ownership.share': new Fraction(1, 3) } } });
        testParcel = Parcels.findOne(testParcelId);
        /* .normalize() method does not work on fraction here, the multiplied denominator stays the result*/
        chai.assert.equal(testParcel.ownedShare().toString(), '6/9');
        chai.assert(testParcel.ownedShare().numerator / testParcel.ownedShare().denominator <= 1);
        chai.assert.throws(() => {
          Memberships.methods.insert._execute({ userId: Fixture.demoAdminId },
            createMembershipWithShare(testParcelId, new Fraction(4, 9)));
        }, 'err_sanityCheckFailed');

        Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, createMembershipWithShare(testParcelId, new Fraction(2, 6)));
        testParcel = Parcels.findOne(testParcelId);
        chai.assert.equal(testParcel.ownedShare(), 1);
        chai.assert.throws(() => {
          Memberships.methods.update._execute({ userId: Fixture.demoAdminId },
            { _id: testMembershipId, modifier: { $set: { 'ownership.share': new Fraction(3, 8) } } });
        }, 'err_sanityCheckFailed');
        done();
      });
    });
  });
}
