/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import './collection-stage.js';

if (Meteor.isServer) {
  describe('collection-stage', function () {
    this.timeout(15000);
    let Whatevers;
    let Stage;

    before(function () {
      Whatevers = new Mongo.Collection('whatevers');
      Mongo.Collection.prototype.staticFindFoo = function() {
        return this.findOne({ foo: { $exists: true } });
      };
      Stage = Whatevers.Stage();
    });

    describe('api', function () {

      it('can insert doc into collection', function () {
        const id = Whatevers.insert({ foo: 'inserted' });
        chai.assert.isDefined(Whatevers.findOne(id));
        chai.assert.isDefined(Whatevers.findOne({ foo: 'inserted' }));
        chai.assert.isDefined(Stage.findOne(id));
        chai.assert.isDefined(Stage.findOne({ foo: 'inserted' }));
      });

      it('can insert doc into staging area', function () {
        const id = Stage.insert({ foo: 'stage-inserted' });
        chai.assert.isUndefined(Whatevers.findOne(id));
        chai.assert.isUndefined(Whatevers.findOne({ foo: 'stage-inserted' }));
        chai.assert.isDefined(Stage.findOne(id));
        chai.assert.isDefined(Stage.findOne({ foo: 'stage-inserted' }));
      });

      it('can use static helpers on the stage', function () {
        chai.assert.isDefined(Stage.staticFindFoo());
      });

      it('can update doc of collection', function () {
        const doc = Whatevers.findOne({ foo: 'inserted' });
        const res = Stage.update(doc._id, { $set: { foo: 'updated' } });
        const newDoc = Stage.findOne(doc._id);
        chai.assert.equal(newDoc.foo, 'updated');
        const oldDoc = Whatevers.findOne(doc._id);
        chai.assert.equal(oldDoc.foo, 'inserted');
      });

      it('can update doc of staging area', function () {
        const doc = Stage.findOne({ foo: 'stage-inserted' });
        const res = Stage.update(doc._id, { $set: { foo: 'stage-updated' } });
        const newDoc = Stage.findOne(doc._id);
        chai.assert.equal(newDoc.foo, 'stage-updated');
        const oldDoc = Whatevers.findOne(doc._id);
        chai.assert.isUndefined(oldDoc);
      });

      it('can commit insert/update operations', function () {
        Stage.commit();
        chai.assert.deepEqual(_.pluck(Stage.find({}).fetch(), 'foo').sort(),
          ['stage-updated', 'updated']);
        chai.assert.deepEqual(_.pluck(Whatevers.find({}).fetch(), 'foo').sort(),
          ['stage-updated', 'updated']);
      });

      it('can remove doc of collection', function () {
        const doc = Whatevers.findOne({ foo: 'stage-updated' });
        chai.assert.isDefined(doc);
        Stage.remove(doc._id);
        chai.assert.isUndefined(Stage.findOne(doc._id));
        chai.assert.isDefined(Whatevers.findOne(doc._id));
      });

      it('can remove doc of staging area', function () {
        const id = Stage.insert({ foo: 'stage-removed' });
        chai.assert.isDefined(Stage.findOne(id));
        chai.assert.isUndefined(Whatevers.findOne(id));
        Stage.remove(id);
        chai.assert.isUndefined(Stage.findOne(id));
        chai.assert.isUndefined(Whatevers.findOne(id));
      });

      it('can commit remove operations', function () {
        Stage.commit();
        chai.assert.deepEqual(_.pluck(Stage.find({}).fetch(), 'foo').sort(),
          ['updated']);
        chai.assert.deepEqual(_.pluck(Whatevers.find({}).fetch(), 'foo').sort(),
          ['updated']);
      });

      it('can discard operations', function () {
        const id = Stage.insert({ foo: 'stage-discarded' });
        chai.assert.isDefined(Stage.findOne(id));
        chai.assert.isUndefined(Whatevers.findOne(id));
        Stage.discard();
        Stage.commit();
        chai.assert.isUndefined(Stage.findOne(id));
        chai.assert.isUndefined(Whatevers.findOne(id));
      });
    });

    describe('validation', function () {
      before(function () {
        Whatevers.schema = new SimpleSchema({
          foo: { type: Number },
        });
        Whatevers.attachSchema(Whatevers.schema);
      });

      it('can insert valid doc into stage and commit to collection', function () {
        const id = Stage.insert({ foo: 42 });
        chai.assert.isUndefined(Whatevers.findOne(id));
        chai.assert.isUndefined(Whatevers.findOne({ foo: 42 }));
        chai.assert.isDefined(Stage.findOne(id));
        chai.assert.isDefined(Stage.findOne({ foo: 42 }));
        Stage.commit();
        chai.assert.isDefined(Whatevers.findOne(id));
        chai.assert.isDefined(Whatevers.findOne({ foo: 42 }));
      });

      it('will not insert invalid doc into stage', function () {
        chai.assert.throws(() => { Stage.insert({ foo: 'notanumber' }); }, 'validation-error');
        chai.assert.isUndefined(Stage.findOne({ foo: 'notanumber' }));
      });

      it('will not update doc of stage with invalid value', function () {
        let doc = Stage.findOne({ foo: 42 });
        chai.assert.isDefined(doc);
        chai.assert.throws(() => { Stage.update(doc._id, { $set: { foo: 'notanumber' } }); }, 'validation-error');
        doc = Stage.findOne(doc._id);
        chai.assert.equal(doc.foo, 42);
      });

      it('can update doc of stage with valid value', function () {
        let doc = Stage.findOne({ foo: 42 });
        chai.assert.isDefined(doc);
        Stage.update(doc._id, { $set: { foo: 200 } });
        doc = Stage.findOne(doc._id);
        chai.assert.equal(doc.foo, 200);
      });
    });
  });
}
