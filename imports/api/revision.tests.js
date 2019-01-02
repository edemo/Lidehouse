/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { RevisionedCollection } from './revision.js';

if (Meteor.isServer) {

  describe('revision', function () {
    this.timeout(5000);

    console.log('in describe');
    const schema = new SimpleSchema({
      textField: { type: String, optional: true },
      nonRevisionedField: { type: String, optional: true },
      booleanField: { type: Boolean, optional: true },
    });
    const collection = new RevisionedCollection('somethings', ['textField', 'booleanField']);
    collection.attachSchema(schema);

    let docId;

    describe('normal operation', function () {
      before(function () {
        docId = collection.insert({
          textField: 'text',
          nonRevisionedField: 'This is not revisioned',
          booleanField: false,
        });
      });

      it('insertion', function (done) {
        const doc = collection.findOne({ textField: 'text' });
        chai.assert.isDefined(doc);
        chai.assert.equal(doc.nonRevisionedField, 'This is not revisioned');
        chai.assert.equal(doc.booleanField, false);
        done();
      });

      it('update string field', function (done) {
        collection.update({ textField: 'text' }, { $set: { textField: 'newText' } });
        const doc = collection.findOne({ textField: 'text' });
        chai.assert.isUndefined(doc);
        const updatedDoc = collection.findOne({ textField: 'newText' });
        chai.assert.isDefined(updatedDoc);
        chai.assert.isDefined(updatedDoc.revision);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
        done();
      });

      it('update non-revisioned field', function (done) {
        collection.update(docId, { $set: { nonRevisionedField: 'Still not revisioned' } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.isDefined(updatedDoc);
        chai.assert.equal(updatedDoc.nonRevisionedField, 'Still not revisioned');
        chai.assert.isDefined(updatedDoc.revision);
        chai.assert.equal(updatedDoc.revision.length, 1);
        done();
      });

      it('update boolean field', function (done) {
        collection.update(docId, { $set: { booleanField: true } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.isDefined(updatedDoc);
        chai.assert.equal(updatedDoc.booleanField, true);
        chai.assert.isDefined(updatedDoc.revision);
        chai.assert.equal(updatedDoc.revision.length, 2);
        chai.assert.equal(updatedDoc.revision[0].field, 'booleanField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, false);
        done();
      });

      it('remove', function (done) {
        collection.remove(docId);
        const doc = collection.findOne(docId);
        chai.assert.isUndefined(doc);
        done();
      });
    });

    describe('edge cases', function () {
      beforeEach(function () {
        docId = collection.insert({
          textField: 'text',
          nonRevisionedField: 'This is not revisioned',
          booleanField: false,
        });
      });

      it('update to empty string', function (done) {
        collection.update(docId, { $set: { textField: '' } });
        let updatedDoc = collection.findOne(docId);
        chai.assert.isDefined(updatedDoc);
        chai.assert.equal(updatedDoc.textField, '');
        chai.assert.isDefined(updatedDoc.revision);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
      
        collection.update(docId, { $set: { textField: 'newText' } });
        updatedDoc = collection.findOne(docId);
        chai.assert.equal(updatedDoc.revision.length, 2);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, '');
        done();
      });

      it('delete field with unset', function (done) {
        collection.update(docId, { $unset: { textField: 0 } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.isDefined(updatedDoc);
        chai.assert.isUndefined(updatedDoc.textField);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
        done();
      });

      it('delete field with set to undefined', function (done) {
        collection.update(docId, { $set: { textField: undefined } });
        const updatedDoc = collection.findOne(docId);
        chai.assert.isDefined(updatedDoc);
        chai.assert.isUndefined(updatedDoc.textField);
        chai.assert.equal(updatedDoc.revision.length, 1);
        chai.assert.equal(updatedDoc.revision[0].field, 'textField');
        chai.assert.equal(updatedDoc.revision[0].oldValue, 'text');
        done();
      });
    });
  });
}
