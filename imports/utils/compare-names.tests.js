/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { compareNames } from '/imports/utils/compare-names.js';

if (Meteor.isServer) {
  describe('compare names', function () {
    this.timeout(15000);
    const nameTwopiece = { firstName: 'János', lastName: 'Kőrösi' };
    const name = { name: 'Kőrösi János' };
    const nameTwopieceCopy = { firstName: 'János', lastName: 'Kőrösi' };
    const lazyTwopiece = { firstName: 'janos', lastName: 'koRoSi' };
    const lazyName = { name: 'korosi janos' };
    const mistypeTwopiece = { firstName: 'Jáons', lastName: 'Kőrösi' };
    const mistypeName = { name: 'Kőrös János' };
    const prefixedName = { name: 'Dr. Kőrösi János Imre' };
    const prefixedTwopiece = { firstName: 'János', lastName: 'Dr. Kőrösi' };
    const prefixedThreepiece = { firstName: 'János', lastName: 'Kőrösi', title: 'Dr' };
    const normalString = 'Ezt a Kőrösi János nevében fizetem be';
    const lazyString = 'ezt a korosi janos neveben fizetem be';
    const mistypeString = 'Eztet a rökösi János számlájára kérem';
    const prefixedString = 'Dr. Kőrösi János Imre számlájára kérem jóváírni';

    it('only works with right parameters', function (done) {
      chai.assert.throws(() => { compareNames(normalString, lazyString); }, 'Debug assertion failed');
      chai.assert.throws(() => { compareNames({ other: 'thing' }, name); }, 'Debug assertion failed');
      done();
    });

    it('matches equals, analogs, finds differents', function (done) {
      chai.assert.equal(compareNames(nameTwopiece, name), 'equal');
      chai.assert.equal(compareNames(name, nameTwopiece), 'equal');
      chai.assert.equal(compareNames(nameTwopiece, nameTwopieceCopy), 'equal');
      // lets consider these equal for now?, pre-and-postfix is not even a mistype
      // (alternatively we can have 'exact' and 'equal')
      chai.assert.equal(compareNames(name, prefixedName), 'analog');
      chai.assert.equal(compareNames(name, prefixedTwopiece), 'analog');
      chai.assert.equal(compareNames(prefixedTwopiece, name), 'analog');
      chai.assert.equal(compareNames(prefixedName, prefixedTwopiece), 'analog');
      chai.assert.equal(compareNames(prefixedName, name), 'analog');
      chai.assert.equal(compareNames(name, lazyTwopiece), 'analog');
      chai.assert.equal(compareNames(nameTwopiece, lazyName), 'analog');
      chai.assert.equal(compareNames(lazyTwopiece, nameTwopiece), 'analog');
      chai.assert.equal(compareNames(prefixedName, lazyTwopiece), 'analog');
      chai.assert.equal(compareNames(prefixedTwopiece, lazyTwopiece), 'analog');

      chai.assert.equal(compareNames(name, mistypeName), 'different');
      chai.assert.equal(compareNames(mistypeTwopiece, name), 'different');
      chai.assert.equal(compareNames(nameTwopiece, mistypeTwopiece), 'different');
      chai.assert.equal(compareNames(mistypeTwopiece, prefixedTwopiece), 'different');
      chai.assert.equal(compareNames(prefixedTwopiece, mistypeTwopiece), 'different');
      done();
    });

    it('finds inclusions', function () {
      chai.assert.equal(compareNames(nameTwopiece, normalString), 'includes');
      chai.assert.equal(compareNames(name, normalString), 'includes');
      chai.assert.equal(compareNames(name, prefixedString), 'includes');
      chai.assert.equal(compareNames(prefixedName, prefixedString), 'includes');
    // chai.assert.equal(compareNames(prefixedTwopiece, normalString), 'includes');

      chai.assert.equal(compareNames(name, lazyString), 'includes-analog');
      chai.assert.equal(compareNames(nameTwopiece, lazyString), 'includes-analog');
      chai.assert.equal(compareNames(lazyName, normalString), 'includes-analog');
      chai.assert.equal(compareNames(lazyName, prefixedString), 'includes-analog');
    // chai.assert.equal(compareNames(prefixedName, normalString), 'includes-analog');
    // chai.assert.equal(compareNames(prefixedName, lazyString), 'includes-analog');

      chai.assert.equal(compareNames(name, mistypeString), 'different');
      chai.assert.equal(compareNames(nameTwopiece, mistypeString), 'different');
      chai.assert.equal(compareNames(mistypeName, normalString), 'different');
    });
  });
}
