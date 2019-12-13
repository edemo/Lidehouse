/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import sinon from 'sinon';
import { Fraction } from 'fractional';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests

import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { insert as insertParcel } from '/imports/api/parcels/methods.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import '/imports/api/users/users.js';

import { Email } from 'meteor/email';   // We will be mocking it over

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;
  let parcelId;

  describe('person', function () {
    this.timeout(15000);
    before(function () {
      sinon.stub(Email);          // Mocking the Email sending
      Fixture = freshFixture();
      parcelId = insertParcel._execute({ userId: Fixture.demoManagerId }, {
        communityId: Fixture.demoCommunityId,
        serial: 1001,
        ref: '1001',
        units: 0,
        floor: 'I',
        door: '11',
        type: 'flat',
      });
      sinon.resetHistory();     // Clearing emails sent during fixture initialization
    });

    describe('onboarding', function () {

      // scenario A1: 1. user creates (and verifies) account, 2. user asks to join community, 3. manager approves (no certification yet) 4. later certification happens
      // scenario A2: 1. user creates (and verifies) account, 2. user meets with manager and there he adds him to community (certified)
      // scenario B1: 1. manager creates an identity to be used in the system
      //                 (no intention to create user account later - can be used to list parcel owner or register in person votes)
      // scenario B2: 1. manager creates an identity and an account for user 2. adds him to community 3. invites him to this account 4. user later accepts
      // scenario B3:
      // scenario BONUS: user changes his email address after all this, or during the process

      describe('Scenario A1: Person creates user account, submits join community request', function () {
        let membershipId;
        let userId;
        after(function () {
          Memberships.remove(membershipId);
          Meteor.users.remove(userId);
        });

        it('[1] user creates an account for himself', function (done) {
          userId = Accounts.createUser({ email: 'newuser@honline.hu', password: 'password' });
          done();
        });

        it('[x] user has no permission to create approved membership', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.insert._execute({ userId }, {   // he is not admin/manager
              communityId: Fixture.demoCommunityId,
              approved: true, // tries to create approved membership
              person: {
                userId,
                idCard: { type: 'natural', name: 'Mr New' },
                contact: { email: 'newuser@honline.hu' },
              },
              role: 'owner',
              parcelId,
              ownership: { share: new Fraction(1, 1) },
            });
          }, 'err_permissionDenied');
          done();
        });

        it('[2] user asks to join community', function (done) {
          membershipId = Memberships.methods.insert._execute({ userId }, {
            communityId: Fixture.demoCommunityId,
            approved: false, // tries to create non-approved membership
            person: {
              userId,
              idCard: { type: 'natural', name: 'Mr New' },
              contact: { email: 'newuser@honline.hu' },
            },
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.Person().id(), userId);
          const user = Meteor.users.findOne(userId);
          // This user has no privileges in the community, until not approved
          chai.assert.isFalse(user.hasRole('owner', Fixture.demoCommunityId));
          chai.assert.isFalse(user.hasPermission('vote.cast', Fixture.demoCommunityId));

          done();
        });

        it('[x] user has no permission to approve himself', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.update._execute({ userId }, {
              _id: membershipId,
              modifier: { $set: { approved: true } },
            });
          }, 'err_permissionDenied');
          done();
        });

        it('[3] manager approves the membership (no certification yet)', function (done) {
          Memberships.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: membershipId,
            modifier: { $set: { approved: true } },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.Person().id(), userId);
          const user = Meteor.users.findOne(userId);
          // Now he has privileges
          chai.assert.isTrue(user.hasRole('owner', Fixture.demoCommunityId));
          chai.assert.isTrue(user.hasPermission('vote.cast', Fixture.demoCommunityId));

          done();
        });

        it('[4] later manager certifies the person', function (done) {
          Memberships.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: membershipId,
            modifier: { $set: { 'person.idCard.identifier': 'JIMS_ID_NUMBER' } },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.Person().id(), userId);    // userId binds stronger than idCard.identifier

          done();
        });

      });

      describe('Scenario A2: Person creates user account, admin adds him to the community', function () {
        let membershipId;
        let userId;
        after(function () {
          Memberships.remove(membershipId);
          Meteor.users.remove(userId);
        });
        
        it('[1] user creates an account for himself', function (done) {
          userId = Accounts.createUser({ email: 'newuser@honline.hu', password: 'password' });
          done();
        });

        it('[2] admin adds him with a role', function (done) {
          membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoAdminId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            person: {
              userId,
              // no contact email
            },
            role: 'accountant',
          });

          const membership = Memberships.findOne(membershipId);
          const user = Meteor.users.findOne(userId);
          chai.assert.equal(membership.Person().id(), userId);
          chai.assert.equal(membership.Person().primaryEmail(), user.getPrimaryEmail());
          chai.assert.isTrue(user.hasRole('accountant', Fixture.demoCommunityId));

          done();
        });

      });

      describe('Scenario B1: manager links person, who will never be a user', function () {
        let membershipId;
        after(function () {
          Memberships.remove(membershipId);
        });

        it('[1] manager creates identifed person, and links it to the parcel with an ownership', function (done) {
          membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            person: {
              idCard: { type: 'natural', name: 'Jim', identifier: 'JIMS_ID_NUMBER' },
              contact: { phone: '+3630 3334445' },
            },
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.Person().id(), 'JIMS_ID_NUMBER');

          done();
        });

        it('[x] cannot link user, when no email address supplied', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });
          }, 'err_sanityCheckFailed');
          done();
        });
      });

      describe('Scenario B2: manager links person, who is not yet a user, but will be', function () {
        let membershipId;
        let userId, user;
        after(function () {
          Memberships.remove(membershipId);
          Meteor.users.remove(userId);
        });

        it('[x] manager unable to create person, with mismatched email', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
              communityId: Fixture.demoCommunityId,
              approved: true,
              person: {
                userId: Fixture.demoUserId, // immediately link him
                idCard: { type: 'natural', name: 'Jim' },
                contact: { name: 'Jimmy', email: 'jim@honline.hu' }, // mismatched contact email supplied
              },
              role: 'owner',
              parcelId,
              ownership: { share: new Fraction(1, 1) },
            });
          }, 'err_sanityCheckFailed');
          done();
        });

        it('[1] manager creates approved person, and links it to the parcel with an ownership', function (done) {
          membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            person: {
              idCard: { type: 'natural', name: 'Jim' },
              contact: { email: 'jim@honline.hu' },
            },
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          let membership = Memberships.findOne(membershipId);
          chai.assert.isUndefined(membership.person.userId);
          chai.assert.isUndefined(membership.Person().id());

          Memberships.methods.update._execute({ userId: Fixture.demoManagerId }, {
            _id: membershipId,
            modifier: { $set: { 'person.idCard.identifier': 'JIMS_ID_NUMBER' } },
          });

          membership = Memberships.findOne(membershipId);
          chai.assert.isUndefined(membership.person.userId);
          chai.assert.equal(membership.Person().id(), 'JIMS_ID_NUMBER');

          done();
        });

        it('[2] manager connects an email adress to the ownership - this triggers an enrollment/invitation email', function (done) {
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });

          const membership = Memberships.findOne(membershipId);
          chai.assert.isDefined(membership.person.userId);
          userId = membership.person.userId;
          user = Meteor.users.findOne(userId);
          chai.assert.equal(membership.Person().id(), userId);
          chai.assert.isFalse(membership.accepted);

          sinon.assert.calledOnce(Email.send);
          const emailOptions = Email.send.getCall(0).args[0];
          chai.assert.equal(emailOptions.to, user.getPrimaryEmail());
          chai.assert.match(emailOptions.text, /enroll/);

          done();
        });

        it('[x] cannot change the linked userId under an existing person', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.update._execute({ userId: Fixture.demoManagerId }, {
              _id: membershipId,
              modifier: { $set: { 'person.userId': Fixture.demoUserId } },
            });
          }, 'err_permissionDenied');
          done();
        });

        it('[o] manager re-links to re-trigger enrollment/invitation email', function (done) {
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });

          const membership = Memberships.findOne(membershipId);
          chai.assert.equal(membership.Person().id(), userId);
          chai.assert.isFalse(membership.accepted);

          sinon.assert.calledTwice(Email.send);
          const emailOptions = Email.send.getCall(1).args[0];
          const emailOptionsPrevious = Email.send.getCall(0).args[0];
          chai.assert.equal(emailOptions.to, user.getPrimaryEmail());
          chai.assert.match(emailOptions.text, /enroll/);
          chai.assert.notEqual(emailOptions.text, emailOptionsPrevious.text);  // new link

          done();
        });

        it('[3] user accepts enrollment (and verifies account)', function (done) {
          Memberships.methods.accept._execute({ userId });

          const membership = Memberships.findOne(membershipId);
          chai.assert.isDefined(membership.person.userId);
          chai.assert.equal(membership.Person().id(), userId);
          chai.assert.isTrue(membership.accepted);    // now he is accepted state

          done();
        });
      });

      describe('Scenario B3: manager links person, who is already a user', function () {
        let alreadyUserId;
        before(function () {
          alreadyUserId = Accounts.createUser({ email: 'alreadyuser@honline.hu', password: 'password' });
        });
        after(function () {
          Meteor.users.remove(alreadyUserId);
        });

        it('B3a: creating membership and linking in same step', function (done) {
          const membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            person: {
              userId: alreadyUserId, // immediately link him
              idCard: { type: 'natural', name: 'Mr Already' },
              // no contact email
            },
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });

          const membership = Memberships.findOne(membershipId);
          const alreadyUser = Meteor.users.findOne(alreadyUserId);
          chai.assert.equal(membership.Person().id(), alreadyUserId);
          chai.assert.equal(membership.Person().primaryEmail(), alreadyUser.getPrimaryEmail());

          Memberships.methods.remove._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });
          done();
        });

        it('B3b: creating membership and linking in two steps', function (done) {
          const membershipId = Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
            communityId: Fixture.demoCommunityId,
            approved: true,
            person: {
              // no userId yet
              idCard: { type: 'natural', name: 'Mr Already' },
              contact: { name: 'Already User', email: 'alreadyuser@honline.hu' },
            },
            role: 'owner',
            parcelId,
            ownership: { share: new Fraction(1, 1) },
          });
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });

          const membership = Memberships.findOne(membershipId);
          const alreadyUser = Meteor.users.findOne(alreadyUserId);
          chai.assert.equal(membership.Person().id(), alreadyUserId);
          chai.assert.equal(membership.Person().primaryEmail(), alreadyUser.getPrimaryEmail());

          Memberships.remove(membershipId);
          done();
        });
      });
    });
  });
}
