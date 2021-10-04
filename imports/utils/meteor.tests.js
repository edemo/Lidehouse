/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';

if (Meteor.isServer) {
  describe('meteor functionality', function() {
    it('foreach iterates on fetched data', function() {
      const Thingys = new Mongo.Collection('thingys');
      Thingys.insert({ counter: 1 });
      Thingys.insert({ counter: 2 });
      Thingys.insert({ counter: 4 });
      chai.assert.equal(Thingys.find().count(), 3);
      const duringIterationResult = [];
      Thingys.find().forEach(t => {
        if (t.counter === 2) {
          Thingys.insert({ counter: 3 });
          Thingys.update({ counter: 2 }, { $inc: { counter: 10 } });
        }
        duringIterationResult.push(t.counter);
      });
      chai.assert.deepEqual(duringIterationResult, [1, 2, 4]);
      const afterIterationResult = Thingys.find().fetch();
      chai.assert.deepEqual(_.pluck(afterIterationResult, 'counter'), [1, 12, 4, 3]);
    });
  });
}
