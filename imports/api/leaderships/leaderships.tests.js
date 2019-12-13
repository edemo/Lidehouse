/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { chai } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';

import { freshFixture } from '/imports/api/test-utils.js';
import { insert as insertLeadership, update as updateLeadership, remove as removeLeadership } from '/imports/api/leaderships/methods.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;
  let userId;
  let communityId;
  let parcelId;
  let leadRef;
  let activeLeadership;
  let leadershipId;
  let leadershipId2;
  let leadershipWithoutActiveTimeId;
  const now = moment().toDate();
  const past = moment().subtract(1, 'weeks').toDate();
  const past2 = moment().subtract(2, 'weeks').toDate();
  const past3 = moment().subtract(3, 'weeks').toDate();
  const past4 = moment().subtract(4, 'weeks').toDate();
  const past5 = moment().subtract(5, 'weeks').toDate();
  const past6 = moment().subtract(6, 'weeks').toDate();
  const past7 = moment().subtract(7, 'weeks').toDate();
  const past8 = moment().subtract(8, 'weeks').toDate();
  const past9 = moment().subtract(9, 'weeks').toDate();
  const past10 = moment().subtract(10, 'weeks').toDate();
  const past11 = moment().subtract(11, 'weeks').toDate();

  describe('leaderships', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('timing', function () {

      it('can insert a leadership without activeTime given', function (done) {

        userId = Fixture.demoManagerId;
        communityId = Fixture.demoCommunityId;
        parcelId = Fixture.dummyParcels[1];
        leadRef = 'AP02';

        leadershipWithoutActiveTimeId = insertLeadership._execute({ userId }, { communityId, parcelId, leadRef });
        done();
      });

      it('can delete a leadership', function (done) {
        removeLeadership._execute({ userId }, { _id: leadershipWithoutActiveTimeId });
        done();
      });

      it('can insert only one active leadership', function (done) {

        activeLeadership = insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: now } });

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past2 } });
        }, 'err_sanityCheckFailed');

        removeLeadership._execute({ userId }, { _id: activeLeadership });

        done();
      });

      it('can\'t insert a leadership, what touches an existing one', function (done) {
        insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past7, end: past4 } });

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past5 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past5, end: past2 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past8, end: past5 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past8, end: past2 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past6, end: past5 } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can insert a leadership, what doesn\'t touches an existing one', function (done) {
        insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past9, end: past8 } });

        done();
      });

      it('can\'t insert an active leadership, if there is a closed one with a newer closing date', function (done) {
        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past8 } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can\'t insert a closed leadership, if there is an active one with an older start date', function (done) {
        leadershipId = insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past3 } });
        chai.assert.throws(() => {
          insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past2, end: past } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can\'t update a leadership, if the result touches an existing one', function (done) {
        leadershipId2 = insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past10, end: past9 } });
        chai.assert.throws(() => {
          updateLeadership._execute({ userId }, { _id: leadershipId2, modifier: { $set: { 'activeTime.end': past6 } } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can update a leadership, if the result doesn\'t touches an existing one', function (done) {
        updateLeadership._execute({ userId }, { _id: leadershipId2, modifier: { $set: { 'activeTime.begin': past11 } } });
      
        done();
      });

      it('can\'t update an active leadership, if there is a closed one with a newer closing date', function (done) {
        updateLeadership._execute({ userId }, { _id: leadershipId, modifier: { $set: { 'activeTime.end': past3 } } });
        const leadershipId3 = insertLeadership._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: now } });
        chai.assert.throws(() => {
          updateLeadership._execute({ userId }, { _id: leadershipId3, modifier: { $set: { 'activeTime.begin': past8 } } });
        }, 'err_sanityCheckFailed');

        done();
      });

    });
  });
}
