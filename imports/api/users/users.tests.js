/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { insert as insertMembership, update as updateMembership, remove as removeMembership  } from '/imports/api/memberships/methods.js';
import { everyRole } from '/imports/api/permissions/config.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';
import { moment } from 'meteor/momentjs:moment';
import '/imports/api/users/users.js'

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('users', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {
    });

    describe('permissions', function () {

      // TODO: Can change identity data before connected to any community
      // TODO: Cannot change identity data after connected to a community
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

      it('scenario A1', function (done) {
        // 1. user creates account
        const userId = Accounts.createUser({ email: 'user@test.com', password: 'password' });
        // 2. user asks to join community

        // 3. manager approves (no certification yet)

        // 4. later certification happens

        done();
      });
    });

    describe('unverified emails', function () {
      const oneWeekAgo = moment().subtract(1, 'week').toDate();
      const twoWeeksAgo = moment().subtract(2, 'week').toDate();
      const threeWeeksAgo = moment().subtract(3, 'week').toDate();

      it('deletes expired unverified emails', function (done) {
        let user = Meteor.users.findOne({ _id: Fixture.dummyUsers[1] });
        Meteor.users.update({ _id: user._id },
          { $push: { 'services.email.verificationTokens':
            { token: 'qwert1234', address: user.emails[0].address, when: threeWeeksAgo } } });
        Meteor.users.update({ _id: user._id },
          { $push: { 'services.email.verificationTokens':
            { token: 'asdfg9876', address: 'secondaddress@demo.com', when: oneWeekAgo } } });
        Meteor.users.update({ _id: user._id }, { $set: { 'emails.1.address': 'secondaddress@demo.com'} });
        user = Meteor.users.findOne({ _id: Fixture.dummyUsers[1] });
        chai.assert.equal(user.emails.length, 2);
        chai.assert.equal(user.services.email.verificationTokens.length, 2);
        cleanExpiredEmails();
        user = Meteor.users.findOne({ _id: Fixture.dummyUsers[1] });
        chai.assert.equal(user.emails.length, 1);
        chai.assert.equal(user.services.email.verificationTokens.length, 1);
        chai.assert.isAbove(user.services.email.verificationTokens[0].when, twoWeeksAgo);
        done();
      });

      it('then deletes users with no email address', function (done) {
        let user = Meteor.users.findOne({ _id: Fixture.dummyUsers[2] });
        Meteor.users.update({ _id: user._id },
          { $push: { 'services.email.verificationTokens':
            { token: 'qwert4567', address: user.emails[0].address, when: threeWeeksAgo } } });
        user = Meteor.users.findOne({ _id: Fixture.dummyUsers[2] });
        chai.assert.equal(user.emails[0].address, user.services.email.verificationTokens[0].address);
        chai.assert.equal(user.emails.length, 1);
        chai.assert.equal(user.services.email.verificationTokens.length, 1);
        cleanExpiredEmails();
        user = Meteor.users.findOne({ _id: Fixture.dummyUsers[2] });
        chai.assert.isUndefined(user);
        const controlUser = Meteor.users.findOne({ _id: Fixture.dummyUsers[1] });
        chai.assert.isDefined(controlUser);
        done();
      });
    });
  });
}
