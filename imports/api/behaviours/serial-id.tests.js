/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { SerialId } from './serial-id.js';

if (Meteor.isServer) {

  describe('serialId behaviour', function () {
    this.timeout(5000);

    const schema = new SimpleSchema({
      textField: { type: String, optional: true },
      category: { type: String, optional: true },
      otherField: { type: String, optional: true },
    });
    const collection = new Mongo.Collection('tobeserialized');
    collection.attachSchema(schema);
    collection.attachBehaviour(SerialId(collection, ['category']));


    let docId;

    describe('normal operation', function () {
      before(function () {
        docId = collection.insert({
          textField: 'text',
          category: 'Countable',
          otherField: '42',
        });
      });

      it('inserts doc with serial', function (done) {
        const doc = collection.findOne({ textField: 'text' });
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.otherField, '42');
        chai.assert.isDefined(doc.serial);
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('serial increases by 1', function (done) {
        const nextDocId = collection.insert({
          textField: 'next text',
          category: 'Countable',
        });
        const doc = collection.findOne(nextDocId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.isDefined(doc.serial);
        chai.assert.equal(doc.serial, 2);
        done();
      });
        
      it('new serial in case of other definer field', function (done) {
        const differentDocId = collection.insert({
          textField: 'next text',
          category: 'Testable',
          otherField: 'field',
        });
        const doc = collection.findOne(differentDocId);
        chai.assert.equal(doc.category, 'Testable');
        chai.assert.isDefined(doc.serial);
        chai.assert.equal(doc.serial, 1);
        done();
      });



    });
  });
}
