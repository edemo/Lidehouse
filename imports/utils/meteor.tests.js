/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';
import { PerformanceLogger } from '/imports/utils/performance-logger.js';

if (Meteor.isServer) {
  xdescribe('meteor functionality', function() {
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

    it('updates faster in one operation', function() {
      const Puffs = new Mongo.Collection('puffs');
      const ids = [];
      for (let i = 0; i < 100; i++) {
        const id = Puffs.insert({ value: i });
        ids.push(id);
      }
      let puffsInOrder = Puffs.find({}, { sort: { value: 1 } }).fetch();
      chai.assert.equal(puffsInOrder[0].value, 0);
      chai.assert.equal(puffsInOrder[99].value, 99);

      PerformanceLogger.startAggregation();
      ids.forEach(id => {
        PerformanceLogger.call('update', Puffs.update, Puffs, { _id: id }, { $inc: { value: 1 } }, { multi: true });
      });
      PerformanceLogger.stopAggregation();
      puffsInOrder = Puffs.find({}, { sort: { value: 1 } }).fetch();
      chai.assert.equal(puffsInOrder[0].value, 1);
      chai.assert.equal(puffsInOrder[99].value, 100);

      PerformanceLogger.call('Multiupdate', Puffs.update, Puffs, { _id: { $in: ids } }, { $inc: { value: 1 } }, { multi: true });
      puffsInOrder = Puffs.find({}, { sort: { value: 1 } }).fetch();
      chai.assert.equal(puffsInOrder[0].value, 2);
      chai.assert.equal(puffsInOrder[1].value, 3);
      chai.assert.equal(puffsInOrder[3].value, 5);
      chai.assert.equal(puffsInOrder[99].value, 101);
    });
  });
}
