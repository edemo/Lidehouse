/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Fraction } from 'fractional';
import '/imports/startup/both/fractional.js';  // TODO: should be automatic, but not included in tests

import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { insert as insertParcel } from '/imports/api/parcels/methods.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';
import { moment } from 'meteor/momentjs:moment';
import '/imports/api/users/users.js';

import { Email } from 'meteor/email';
// Mocking the Email sending
Email.send = function (options) {
  console.log(options.subject);
};

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;
  let parcelId;

  describe('person', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      parcelId = insertParcel._execute({ userId: Fixture.demoManagerId }, {
        communityId: Fixture.demoCommunityId,
        serial: '1001',
        units: 0,
        floor: 'I',
        number: '11',
        type: 'flat',
      });
    });

    describe('certification', function () {
//      const community = Communities.findOne(Fixture.demoCommunityId);
      const admin = 0;
      const manager = 0;

// scenario A1: 1. user creates (and verifies) account, 2. user asks to join community, 3. manager approves (no certification yet) 4. later certification happens
// scenario A2: 1. user creates (and verifies) account, 2. user meets with manager and there he adds him to community (certified)
// scenario B1: 1. manager creates an identity to be used in the system
//                 (no intention to create user account later - can be used to list parcel owner or register in person votes)
// scenario B2: 1. manager creates an identity and an account for user 2. adds him to community 3. invites him to this account 4. user later accepts
// scenario BONUS: user changes his email address after all this, or during the process

      describe('Scenario A1: ', function () {
        it('scenario A1', function (done) {
          // 1. user creates account
          const userId = Accounts.createUser({ email: 'user@honline.hu', password: 'password' });
          // 2. user asks to join community

          // 3. manager approves (no certification yet)

          // 4. later certification happens

          done();
        });
      });

      describe('Scenario B2: manager invites person, who is not yet a user', function () {
        let membershipId;

        after(function () {
          Memberships.methods.remove._execute({ userId: Fixture.demoManagerId }, { _id: membershipId });
        });
/*
        it('manager unable to create person,  and invite him in same step', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.insert._execute({ userId: Fixture.demoManagerId }, {
              communityId: Fixture.demoCommunityId,
              approved: true,
              person: {
                userEmail: 'jim@honline.hu', // immediately invite him
                idCard: { type: 'natural', name: 'Jim' },
                contact: { name: 'Jimmy' }, // no contact email supplied
              },
              role: 'owner',
              parcelId,
              ownership: { share: new Fraction(1, 1) },
            });
          });
          done();
        });
*/
        it('non-manager unable to create approved person', function (done) {
          chai.assert.throws(() => {
            Memberships.methods.insert._execute({ userId: Fixture.demoUserId }, {   // not the manager
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
          });
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
          done();
        });

        it('[2] manager connects an email adress to the ownership - this triggers an enrollment/invitation email', function (done) {          
          Memberships.methods.linkUser._execute({ userId: Fixture.demoManagerId }, {
            _id: membershipId,
            email: 'jim@honline.hu',
          });
          done();
        });

        it('[3] user accepts enrollment', function (done) {          
          done();
        });
      });
    });
  });
}
