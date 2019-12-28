/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { chai } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';

import { freshFixture } from '/imports/api/test-utils.js';
import { insert as insertParcelship, update as updateParcelship, remove as removeParcelship } from '/imports/api/parcelships/methods.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;
  let userId;
  let communityId;
  let parcelId;
  let leadRef;
  let activeParcelship;
  let parcelshipId;
  let parcelshipId2;
  let parcelshipWithoutActiveTimeId;
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

  describe('parcelships', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('timing', function () {

      it('can insert a parcelship without activeTime given', function (done) {

        userId = Fixture.demoManagerId;
        communityId = Fixture.demoCommunityId;
        parcelId = Fixture.dummyParcels[1];
        leadRef = 'AP02';

        parcelshipWithoutActiveTimeId = insertParcelship._execute({ userId }, { communityId, parcelId, leadRef });
        done();
      });

      it('can delete a parcelship', function (done) {
        removeParcelship._execute({ userId }, { _id: parcelshipWithoutActiveTimeId });
        done();
      });

      it('can insert only one active parcelship', function (done) {

        activeParcelship = insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: now } });

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past2 } });
        }, 'err_sanityCheckFailed');

        removeParcelship._execute({ userId }, { _id: activeParcelship });

        done();
      });

      it('can\'t insert a parcelship, what touches an existing one', function (done) {
        insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past7, end: past4 } });

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past5 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past5, end: past2 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past8, end: past5 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past8, end: past2 } });
        }, 'err_sanityCheckFailed');

        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past6, end: past5 } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can insert a parcelship, what doesn\'t touches an existing one', function (done) {
        insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past9, end: past8 } });

        done();
      });

      it('can\'t insert an active parcelship, if there is a closed one with a newer closing date', function (done) {
        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past8 } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can\'t insert a closed parcelship, if there is an active one with an older start date', function (done) {
        parcelshipId = insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past3 } });
        chai.assert.throws(() => {
          insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past2, end: past } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can\'t update a parcelship, if the result touches an existing one', function (done) {
        parcelshipId2 = insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: past10, end: past9 } });
        chai.assert.throws(() => {
          updateParcelship._execute({ userId }, { _id: parcelshipId2, modifier: { $set: { 'activeTime.end': past6 } } });
        }, 'err_sanityCheckFailed');

        done();
      });

      it('can update a parcelship, if the result doesn\'t touches an existing one', function (done) {
        updateParcelship._execute({ userId }, { _id: parcelshipId2, modifier: { $set: { 'activeTime.begin': past11 } } });
      
        done();
      });

      it('can\'t update an active parcelship, if there is a closed one with a newer closing date', function (done) {
        updateParcelship._execute({ userId }, { _id: parcelshipId, modifier: { $set: { 'activeTime.end': past3 } } });
        const parcelshipId3 = insertParcelship._execute({ userId }, { communityId, parcelId, leadRef, activeTime: { begin: now } });
        chai.assert.throws(() => {
          updateParcelship._execute({ userId }, { _id: parcelshipId3, modifier: { $set: { 'activeTime.begin': past8 } } });
        }, 'err_sanityCheckFailed');

        done();
      });

    });
  });
}
