/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks, one-var, one-var-declaration-per-line */

import { Meteor } from 'meteor/meteor';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { freshFixture } from '/imports/api/test-utils.js';
import { Topics } from '/imports/api/topics/topics.js';

if (Meteor.isServer) {

  let Fixture;
  let communityId;
  let userId;
  let header;

  describe('batch-method', function () {
    this.timeout(15000);
/*
    const collection = new Mongo.Collection('batchables');
    const insertMethod = new ValidatedMethod({
      name: 'batchables.insert',
      validate: null,
      run(doc) {
        collection.insert(doc);
      },
    });
    const batchInsertMethod = new BatchMethod(insertMethod);
*/
    describe('normal operation', function () {
      let topic1, topic2, topic3;
      let doc1, doc2, doc3;
      before(function () {
        Fixture = freshFixture();
        Topics.remove({});
        communityId = Fixture.demoCommunityId;
        userId = Fixture.demoAdminId;
        header = { communityId, userId, category: 'ticket', status: 'reported', ticket: { type: 'issue', urgency: 'normal' } };
      });

      it('inserts single', function (done) {
        topic1 = { ...header, serial: 1, title: 'First', text: '-' };
        const params1 = { args: [topic1] };

        const ops = Topics.methods.batch.test._execute({ userId }, params1);
        chai.assert.equal(ops.insert.length, 1);
        chai.assert.equal(ops.update.length, 0);
        chai.assert.equal(ops.noChange.length, 0);
        chai.assert.deepEqual(ops.insert, [1-1]);

//        Topics.methods.batch.insert._execute({ userId }, params1);
        Topics.methods.batch.upsert._execute({ userId }, params1);
        doc1 = Topics.findOne({ title: 'First' });
        chai.assert.isDefined(doc1);
        done();
      });

      it('inserts multiple', function (done) {
        topic1 = { ...header, serial: 1, title: 'First', text: '-' };
        topic2 = { ...header, serial: 2, title: 'Second', text: '-' };
        topic3 = { ...header, serial: 3, title: 'Third', text: '-' };
        const insert23 = { args: [topic2, topic3] };
        const params = { args: [topic1, topic2, topic3] };

        const ops = Topics.methods.batch.test._execute({ userId }, params);
        chai.assert.equal(ops.insert.length, 2);
        chai.assert.equal(ops.update.length, 0);
        chai.assert.equal(ops.noChange.length, 1);
        chai.assert.deepEqual(ops.insert, [2-1, 3-1]);

//        Topics.methods.batch.insert._execute({ userId }, insert23);
        Topics.methods.batch.upsert._execute({ userId }, params);
        doc2 = Topics.findOne({ title: 'Second' });
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.isDefined(doc2);
        chai.assert.isDefined(doc3);
        done();
      });

      it('updates single', function (done) {
        topic3 = { ...header, serial: 3, title: 'Third', text: 'third' };
        const params3 = { args: [topic3] };
        const update3 = { args: [{ _id: doc3._id, modifier: { $set: { text: 'third' } } }] };

        const ops = Topics.methods.batch.test._execute({ userId }, params3);
        chai.assert.equal(ops.insert.length, 0);
        chai.assert.equal(ops.update.length, 1);
        chai.assert.equal(ops.noChange.length, 0);
        chai.assert.deepEqual(ops.update, update3.args);

//        Topics.methods.batch.update._execute({ userId }, update3);
        Topics.methods.batch.upsert._execute({ userId }, params3);
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.equal(doc3.text, 'third');
        done();
      });

      it('updates multiple', function (done) {
        topic3 = { ...header, serial: 3, title: 'Third', text: 'third' };
        topic2 = { ...header, serial: 2, title: 'Second', text: 'second' };
        topic1 = { ...header, serial: 1, title: 'First', text: 'first' };
        const update21 = {
          args: [{ _id: doc2._id, modifier: { $set: { text: 'second' } } }, { _id: doc1._id, modifier: { $set: { text: 'first' } } }],
        };
        const params = { args: [topic3, topic2, topic1] };

        const ops = Topics.methods.batch.test._execute({ userId }, params);
        chai.assert.equal(ops.insert.length, 0);
        chai.assert.equal(ops.update.length, 2);
        chai.assert.equal(ops.noChange.length, 1);
        chai.assert.deepEqual(ops.update, update21.args);

//        Topics.methods.batch.update._execute({ userId }, update21);
        Topics.methods.batch.upsert._execute({ userId }, params);
        doc2 = Topics.findOne({ title: 'Second' });
        doc1 = Topics.findOne({ title: 'First' });
        chai.assert.equal(doc2.text, 'second');
        chai.assert.equal(doc1.text, 'first');
        done();
      });

      xit('removes multiple', function (done) {
        const remove123 = {
          args: [{ _id: doc1._id }, { _id: doc2._id }, { _id: doc3._id }],
        };

        Topics.methods.batch.remove._execute({ userId }, remove123);
        doc1 = Topics.findOne({ title: 'First' });
        doc2 = Topics.findOne({ title: 'Second' });
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.isUndefined(doc1);
        chai.assert.isUndefined(doc2);
        chai.assert.isUndefined(doc3);
        done();
      });

    });

    describe('exception handling', function () {
      let topic1, topic2, topic3;
      let doc1, doc2, doc3;
      before(function () {
        Fixture = freshFixture();
        Topics.remove({});
        communityId = Fixture.demoCommunityId;
        userId = Fixture.demoAdminId;
        header = { communityId, userId, category: 'ticket', status: 'reported', ticket: { type: 'issue', urgency: 'normal' } };
      });

      it('when upserting multiple, and one has error, the rest is upserted', function (done) {
        topic1 = { ...header, serial: 1, title: 'FIRST', text: '-' };
        topic2 = { communityId, serial: 2, category: 'INVALID', title: 'SECOND', text: '-' };
        topic3 = { ...header, serial: 3, title: 'THIRD', text: '-' };
        const params = { args: [topic1, topic2, topic3] };

        chai.assert.throws(() => {
          const ret = Topics.methods.batch.upsert._execute({ userId }, params);
        }, 'INVALID is not an allowed value [,validation-error]');
//        chai.assert.equal(ret.errors.length, 1);
//        chai.assert.equal(ret.results.length, 2);
        doc1 = Topics.findOne({ title: 'FIRST' });
        doc2 = Topics.findOne({ title: 'SECOND' });
        doc3 = Topics.findOne({ title: 'THIRD' });
        chai.assert.isDefined(doc1);
        chai.assert.isUndefined(doc2);
        chai.assert.isDefined(doc3);
        done();
      });

    });
  });
}
