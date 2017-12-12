/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { descartesProduct } from './descartes';

if (Meteor.isClient) {
  describe('descartes', function() {
    it('works', function() {
      const array1 = ['1', '2'];
      const array2 = ['x'];
      const array3 = ['a', 'b', 'c'];
      const descartes = descartesProduct([array1, array2, array3]);
      const result = [['1', 'x', 'a'], ['1', 'x', 'b'], ['1', 'x', 'c'],
                      ['2', 'x', 'a'], ['2', 'x', 'b'], ['2', 'x', 'c']];
      chai.assert.deepEqual(descartes, result);
    });
  });
}
