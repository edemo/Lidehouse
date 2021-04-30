/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { chai } from 'meteor/practicalmeteor:chai';
import { moment } from 'meteor/momentjs:moment';

import { freshFixture } from '/imports/api/test-utils.js';
import { Contracts } from './contracts.js';
import './methods.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;
  let userId;
  let communityId;
  let parcelId;
  let leadParcelId;
  let activeContract;
  let contractId;
  let contractId2;
  let contractWithoutActiveTimeId;
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

  describe('contracts', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
      Contracts.remove({});
    });

    describe('member contracts sanity', function () {

      it('can insert a contract without activeTime given', function (done) {
        userId = Fixture.demoManagerId;
        communityId = Fixture.demoCommunityId;
        parcelId = Fixture.dummyParcels[1];
        leadParcelId = Fixture.dummyParcels[2];

        contractWithoutActiveTimeId = Fixture.builder.create('memberContract', { parcelId, leadParcelId });
        done();
      });

      it('can delete a contract', function (done) {
        Fixture.builder.execute(Contracts.methods.remove, { _id: contractWithoutActiveTimeId });
        done();
      });

      it('can insert only one active contract', function (done) {
        activeContract = Contracts.methods.insert._execute({ userId }, { communityId, relation: 'member', parcelId, leadParcelId, activeTime: { begin: now } });
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past } });
        }, 'err_sanityCheckFailed');
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past2 } });
        }, 'err_sanityCheckFailed');
        Fixture.builder.execute(Contracts.methods.remove, { _id: activeContract });
        done();
      });

      it('can\'t insert a contract, what touches an existing one', function (done) {
        Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past7, end: past4 } });
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past5 } });
        }, 'err_sanityCheckFailed');
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past5, end: past2 } });
        }, 'err_sanityCheckFailed');
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past8, end: past5 } });
        }, 'err_sanityCheckFailed');
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past8, end: past2 } });
        }, 'err_sanityCheckFailed');
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past6, end: past5 } });
        }, 'err_sanityCheckFailed');
        done();
      });

      it('can insert a contract, what doesn\'t touches an existing one', function (done) {
        Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past9, end: past8 } });
        done();
      });

      it('can\'t insert an active contract, if there is a closed one with a newer closing date', function (done) {
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past8 } });
        }, 'err_sanityCheckFailed');
        done();
      });

      it('can\'t insert a closed contract, if there is an active one with an older start date', function (done) {
        contractId = Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past3 } });
        chai.assert.throws(() => {
          Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past2, end: past } });
        }, 'err_sanityCheckFailed');
        done();
      });

      it('can\'t update a contract, if the result touches an existing one', function (done) {
        contractId2 = Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: past10, end: past9 } });
        chai.assert.throws(() => {
          Fixture.builder.execute(Contracts.methods.update, { _id: contractId2, modifier: { $set: { 'activeTime.end': past6 } } });
        }, 'err_sanityCheckFailed');
        done();
      });

      it('can update a contract, if the result doesn\'t touches an existing one', function (done) {
        Fixture.builder.execute(Contracts.methods.update, { _id: contractId2, modifier: { $set: { 'activeTime.begin': past11 } } });
        done();
      });

      it('can\'t have a contract with the same begin and end date', function (done) {
        chai.assert.throws(() => {
          Fixture.builder.execute(Contracts.methods.update, { _id: contractId, modifier: { $set: { 'activeTime.begin': past3, 'activeTime.end': past3 } } });
        }, 'validation-error');
        done();
      });

      it('can\'t update an active contract, if there is a closed one with a newer closing date', function (done) {
        Fixture.builder.execute(Contracts.methods.update, { _id: contractId, modifier: { $set: { 'activeTime.end': past2 } } });
        const contractId3 =  Fixture.builder.create('memberContract', { parcelId, leadParcelId, activeTime: { begin: now } });
        chai.assert.throws(() => {
          Fixture.builder.execute(Contracts.methods.update, { _id: contractId3, modifier: { $set: { 'activeTime.begin': past8 } } });
        }, 'err_sanityCheckFailed');
        done();
      });
    });
  });
}
