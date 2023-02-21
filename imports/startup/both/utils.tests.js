/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { chai, assert } from 'meteor/practicalmeteor:chai';

import './utils.js';

if (Meteor.isServer) {
  describe('utils', function () {
    this.timeout(15000);

    describe('Array.difference', function () {
      it('can diff 2 arrays', function () {
        const array1 = ['apple', 'banana'];
        const array2 = ['citron', 'banana'];
        chai.assert.deepEqual(Array.difference(array1, array2), ['apple']);
        chai.assert.deepEqual(Array.difference(array2, array1), ['citron']);
      });

      it('can diff empty arrays', function () {
        const array1 = ['apple', 'banana'];
        const array2 = [];
        chai.assert.deepEqual(Array.difference(array1, array2), ['apple', 'banana']);
        chai.assert.deepEqual(Array.difference(array2, array1), []);
      });

      it('can diff undefined arrays', function () {
        const array1 = ['apple', 'banana'];
        const array2 = undefined;
        // Should it throw exception?
        chai.assert.deepEqual(Array.difference(array1, array2), ['apple', 'banana']);
        chai.assert.deepEqual(Array.difference(array2, array1), []);
      });
    });

  });
}
