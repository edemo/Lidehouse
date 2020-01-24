/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import faker from 'faker';
import { Timestamped } from './timestamped.js';
import { SerialId } from './serial-id.js';

if (Meteor.isServer) {

  describe('SerialId behaviour', function () {
    this.timeout(15000);
    after(function () {
      resetDatabase();
    });

    const schema = new SimpleSchema({
      textField: { type: String, optional: true },
      category: { type: String, optional: true },
      otherField: { type: Object, blackbox: true, optional: true },
      communityId: { type: String, optional: true },
    });

    const collection0 = new Mongo.Collection('with_0_definerField');
    collection0.attachSchema(schema);
    collection0.attachBehaviour(Timestamped);
    collection0.attachBehaviour(SerialId());
    collection0.helpers({ community() { return { settings: { language: 'en' } }; } });

    const collection1 = new Mongo.Collection('with_1_definerField');
    collection1.attachSchema(schema);
    collection1.attachBehaviour(Timestamped);
    collection1.attachBehaviour(SerialId(['category']));
    collection1.helpers({ community() { return { settings: { language: 'en' } }; } });

    const collection2 = new Mongo.Collection('with_2_definerField');
    collection2.attachSchema(schema);
    collection2.attachBehaviour(Timestamped);
    collection2.attachBehaviour(SerialId(['category', 'otherField.color']));
    collection2.helpers({ community() { return { settings: { language: 'en' } }; } });
    
    const docData1 = { textField: faker.random.word(), category: 'Countable', otherField: { color: 'pink' }, communityId: 'no1', serial: 0 };
    const docData2 = { textField: faker.random.word(), category: 'Countable', otherField: { color: 'green' }, communityId: 'no1', serial: 0 };
    const docData3 = { textField: faker.random.word(), category: 'Testable', otherField: { color: 'pink' }, communityId: 'no1', serial: 0 };
    const docData4 = { textField: faker.random.word(), category: 'Countable', otherField: { color: 'green' }, communityId: 'no2', serial: 0 };
    const docData5 = { textField: faker.random.word(), otherField: { color: 'pink' }, communityId: 'no1', serial: 0 };

    describe('1 definer field', function () {

      it('inserts doc with serial', function (done) {
        const docId = collection1.insert(docData1);
        const doc = collection1.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.isDefined(doc.serial);
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('serial increases by 1', function (done) {
        const docId = collection1.insert(docData2);
        const doc = collection1.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.serial, 2);
        done();
      });

      it('new serial in case of other definer field value', function (done) {
        const docId = collection1.insert(docData3);
        const doc = collection1.findOne(docId);
        chai.assert.equal(doc.category, 'Testable');
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('new serial in case of different community Id', function (done) {
        const docId = collection1.insert(docData4);
        const doc = collection1.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('new serial if definer field is missing from doc', function (done) {
        const docId = collection1.insert(docData5);
        const doc = collection1.findOne(docId);
        chai.assert.isUndefined(doc.category);
        chai.assert.equal(doc.serial, 1);
        done();
      });
    });

    describe('2 definer fields', function () {

      it('inserts doc with serial with 2 definerfields', function (done) {
        const docId = collection2.insert(docData1);
        const doc = collection2.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.otherField.color, 'pink');
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('new serial for 1 different definerfield value', function (done) {
        const docId = collection2.insert(docData2);
        const doc = collection2.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.otherField.color, 'green');
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('new serial if 1 definer field is missing from doc', function (done) {
        const docId = collection2.insert(docData5);
        const doc = collection2.findOne(docId);
        chai.assert.isUndefined(doc.category);
        chai.assert.equal(doc.otherField.color, 'pink');
        chai.assert.equal(doc.serial, 1);
        done();
      });
    });

    describe('no definer field', function () {
      it('inserts doc with serial with no definer field', function (done) {
        const docId = collection0.insert(docData1);
        const doc = collection0.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.serial, 1);
        done();
      });

      it('serial increases by 1', function (done) {
        const docId = collection0.insert(docData3);
        const doc = collection0.findOne(docId);
        chai.assert.equal(doc.category, 'Testable');
        chai.assert.equal(doc.serial, 2);
        done();
      });

      it('new serial in case of different community Id', function (done) {
        const docId = collection0.insert(docData4);
        const doc = collection0.findOne(docId);
        chai.assert.equal(doc.category, 'Countable');
        chai.assert.equal(doc.serial, 1);
        done();
      });
    });

    describe('edge cases', function () {
      xit('throws error if no collection1 is given as attribute', function (done) {
        const collection4 = new Mongo.Collection('noCollection');
        collection4.attachSchema(schema);
        chai.assert.throws(() => collection4.attachBehaviour(SerialId()));
        done();
      });

      xit('continues serial in case of removing doc', function (done) {
        // Are documents with serial removable?
        done();
      });
    });
  });
}
