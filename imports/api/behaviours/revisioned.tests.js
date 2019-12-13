/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Revisioned } from './revisioned.js';

if (Meteor.isServer) {

  describe('revision', function () {
    this.timeout(15000);

    const schema = new SimpleSchema({
      textField: { type: String, optional: true },
      nonRevisionedField: { type: String, optional: true },
      booleanField: { type: Boolean, optional: true },
    });
    const collection = new Mongo.Collection('somethings');
    collection.attachSchema(schema);
    collection.attachBehaviour(Revisioned(['textField', 'booleanField']));

    let docId;

    describe('normal operation', function () {
      before(function () {
        docId = collection.insert({
          textField: 'text',
          nonRevisionedField: 'This is not revisioned',
          booleanField: false,
        });
      });

      it('inserts docs', function (done) {
        const doc = collection.findOne({ textField: 'text' });
        chai.assert.equal(doc.nonRevisionedField, 'This is not revisioned');
        chai.assert.equal(doc.booleanField, false);
        chai.assert.isUndefined(doc.revision);
        done();
      });

      it('update revisions string field', function (done) {
        collection.update({ textField: 'text' }, { $set: { textField: 'newText' } });
        const doc = collection.findOne({ textField: 'text' });
        chai.assert.isUndefined(doc);
        const updatedDoc = collection.findOne({ textField: 'newText' });
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
        done();
      });

      it('update doesnt revision for non-revisioned field', function (done) {
        collection.update(docId, { $set: { nonRevisionedField: 'Still not revisioned' } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.equal(updatedDoc.nonRevisionedField, 'Still not revisioned');
        chai.assert.equal(updatedDoc.revision.length, 1);
        done();
      });

      it('update doesnt revision if same value comes', function (done) {
        collection.update(docId, { $set: { textField: 'newText' } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
        done();
      });

      it('update revisions boolean field', function (done) {
        collection.update(docId, { $set: { booleanField: true } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.equal(updatedDoc.booleanField, true);
        chai.assert.equal(updatedDoc.revision.length, 2);
        chai.assert.equal(updatedDoc.revision[0].field, 'booleanField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, false);
        done();
      });

      it('removes docs', function (done) {
        collection.remove(docId);
        const doc = collection.findOne(docId);
        chai.assert.isUndefined(doc);
        done();
      });
    });

    xdescribe('edge cases', function () {
      beforeEach(function () {
        docId = collection.insert({
          textField: 'text',
          nonRevisionedField: 'This is not revisioned',
          booleanField: false,
        });
      });

      afterEach(function () {
        collection.remove(docId);
      });

      it('handles unset field', function (done) {
        collection.update(docId, { $unset: { textField: '' } });
        let updatedDoc = collection.findOne(docId);
        chai.assert.isUndefined(updatedDoc.textField);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');

        collection.update(docId, { $set: { textField: 'newText' } });
        updatedDoc = collection.findOne(docId);
        chai.assert.equal(updatedDoc.revision.length, 2);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.isUndefined(updatedDoc.revision[0].oldValue);
        done();
      });

      it('handles empty string', function (done) {
        collection.update(docId, { $set: { textField: '' } });
        let updatedDoc = collection.findOne(docId);
        chai.assert.isUndefined(updatedDoc.textField);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
 
        collection.update(docId, { $set: { textField: 'newText' } });
        updatedDoc = collection.findOne(docId);
        chai.assert.equal(updatedDoc.revision.length, 2);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.isUndefined(updatedDoc.revision[0].oldValue);
        done();
      });
    });
  });
}
