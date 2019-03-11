/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { ParcelBillings } from './parcel-billings.js';
import './methods.js';

if (Meteor.isServer) {
  let Fixture;

  describe('parcel billings', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });
    after(function () {
    });

    describe('api', function () {
      before(function () {
      });

      it('works', function () {
      });
    });

    describe('calculation', function () {
      before(function () {
      });

      it('calculates correctly per area', function () {
      });
    });
  });
}
