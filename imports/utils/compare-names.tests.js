/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { compareNames } from '/imports/utils/compare-names.js';

if (Meteor.isServer) {
   
  describe.only('compare names', function() {
    this.timeout(5000);
    const nameTwopiece = { firstName: 'János', lastName: 'Kőrösi'};
    const name = { name: 'Kőrösi János'};
    const nameTwopieceCopy = { firstName: 'János', lastName: 'Kőrösi'};
    const lazyTwopiece = { firstName: 'janos', lastName: 'koRoSi'}; 
    const lazyName = { name: 'korosi janos'};
    const mistypeTwopiece = { firstName: 'Jáons', lastName: 'Kőrösi'};
    const mistypeName = { name: 'Kőrös János'};
    const normalString = "Ez a Kőrösi János számlája";
    const lazyString = "ez a korosi janos Szamlaja";
    const mistypeString = "Ez a rökösi János számlája";

    it('only works with right parameters', function(done) {
      chai.assert.throws(() => { compareNames(normalString, lazyString) });
      chai.assert.throws(() => { compareNames({other: 'thing'}, name) });
      done();
    });

    it('matches equals, analogs, finds differents', function(done) {
      chai.assert.equal(compareNames(nameTwopiece, name), 'equal');
      chai.assert.equal(compareNames(name, nameTwopiece), 'equal');
      chai.assert.equal(compareNames(nameTwopiece, nameTwopieceCopy), 'equal');
      chai.assert.equal(compareNames(name, lazyTwopiece), 'analog');
      chai.assert.equal(compareNames(nameTwopiece, lazyName), 'analog');
      chai.assert.equal(compareNames(lazyTwopiece, nameTwopiece), 'analog');
      chai.assert.equal(compareNames(name, mistypeName), 'different');
      chai.assert.equal(compareNames(mistypeTwopiece, name), 'different');
      chai.assert.equal(compareNames(nameTwopiece, mistypeTwopiece), 'different');
      done();
    });

    it('finds inclusions', function() {
      chai.assert.equal(compareNames(nameTwopiece, normalString), 'includes');
      chai.assert.equal(compareNames(name, normalString), 'includes');
      chai.assert.equal(compareNames(name, lazyString), 'includes-analog');
      chai.assert.equal(compareNames(nameTwopiece, lazyString), 'includes-analog');
      chai.assert.equal(compareNames(lazyName, normalString), 'includes-analog');
      chai.assert.equal(compareNames(name, mistypeString), 'different');
      chai.assert.equal(compareNames(nameTwopiece, mistypeString), 'different');
      chai.assert.equal(compareNames(mistypeName, normalString), 'different');
    });
  });
}
