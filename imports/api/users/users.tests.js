/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { cleanExpiredEmails } from '/imports/startup/server/accounts-verification.js';
import { moment } from 'meteor/momentjs:moment';
import '/imports/api/users/users.js'

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('users', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {
    });

    describe('permissions', function () {

      // TODO: Can change identity data before connected to any community
      // TODO: Cannot change identity data after connected to a community
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
