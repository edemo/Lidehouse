/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks, one-var, one-var-declaration-per-line */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { chai, assert } from 'meteor/practicalmeteor:chai';

import { freshFixture } from '/imports/api/test-utils.js';
import { BatchMethod } from './batch-method.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { Factory } from 'meteor/dburles:factory';

if (Meteor.isServer) {

  let Fixture;
  let communityId;
  let userId;
  let header;

  describe('batch-method', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      Topics.remove({});
      communityId = Fixture.demoCommunityId;
      userId = Fixture.demoAdminId;
      header = { communityId, userId, category: 'ticket', status: 'reported', ticket: { type: 'issue' } };
    });
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
      
      it('inserts single', function (done) {
        topic1 = { ...header, serial: 1, title: 'First', text: '-' };
        const params1 = { communityId, args: [topic1] };

        const ops = Topics.methods.batch.test._execute({ userId }, params1);
        chai.assert.equal(ops.insert.length, 1);
        chai.assert.equal(ops.update.length, 0);
        chai.assert.equal(ops.noChange.length, 0);
        chai.assert.deepEqual(ops.insert, params1.args);

        Topics.methods.batch.insert._execute({ userId }, params1);
        doc1 = Topics.findOne({ title: 'First' });
        chai.assert.isDefined(doc1);
        done();
      });

      it('inserts multiple', function (done) {
        topic1 = { ...header, serial: 1, title: 'First', text: '-' };
        topic2 = { ...header, serial: 2, title: 'Second', text: '-' };
        topic3 = { ...header, serial: 3, title: 'Third', text: '-' };

        const ops = Topics.methods.batch.test._execute({ userId }, { communityId, args: [topic1, topic2, topic3] });
        chai.assert.equal(ops.insert.length, 2);
        chai.assert.equal(ops.update.length, 0);
        chai.assert.equal(ops.noChange.length, 1);
        chai.assert.deepEqual(ops.insert, [topic2, topic3]);

        Topics.methods.batch.insert._execute({ userId }, { communityId, args: [topic2, topic3] });
        doc2 = Topics.findOne({ title: 'Second' });
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.isDefined(doc2);
        chai.assert.isDefined(doc3);
        done();
      });

      it('updates single', function (done) {
        topic3 = { ...header, serial: 3, title: 'Third', text: 'third' };
        const update3 = { communityId, args: [{ _id: doc3._id, modifier: { $set: topic3 } }] };

        const ops = Topics.methods.batch.test._execute({ userId }, { communityId, args: [topic3] });
        chai.assert.equal(ops.insert.length, 0);
        chai.assert.equal(ops.update.length, 1);
        chai.assert.equal(ops.noChange.length, 0);
        chai.assert.deepEqual(ops.update, update3.args);

        Topics.methods.batch.update._execute({ userId }, update3);
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.equal(doc3.text, 'third');
        done();
      });

      it('updates multiple', function (done) {
        topic3 = { ...header, serial: 3, title: 'Third', text: 'third' };
        topic2 = { ...header, serial: 2, title: 'Second', text: 'second' };
        topic1 = { ...header, serial: 1, title: 'First', text: 'first' };
        const update21 = { communityId,
          args: [{ _id: doc2._id, modifier: { $set: topic2 } }, { _id: doc1._id, modifier: { $set: topic1 } }],
        };

        const ops = Topics.methods.batch.test._execute({ userId }, { communityId, args: [topic3, topic2, topic1] });
        chai.assert.equal(ops.insert.length, 0);
        chai.assert.equal(ops.update.length, 2);
        chai.assert.equal(ops.noChange.length, 1);
        chai.assert.deepEqual(ops.update, update21.args);

        Topics.methods.batch.update._execute({ userId }, update21);
        doc2 = Topics.findOne({ title: 'Second' });
        doc1 = Topics.findOne({ title: 'First' });
        chai.assert.equal(doc2.text, 'second');
        chai.assert.equal(doc1.text, 'first');
        done();
      });

      it('removes multiple', function (done) {
        Topics.methods.batch.remove._execute({ userId }, { communityId,
          args: [{ _id: doc1._id }, { _id: doc2._id }, { _id: doc3._id }],
        });

        doc1 = Topics.findOne({ title: 'First' });
        doc2 = Topics.findOne({ title: 'Second' });
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.isUndefined(doc1);
        chai.assert.isUndefined(doc2);
        chai.assert.isUndefined(doc3);
        done();
      });

      it('when inerting multiple, and one has error, the rest is inserted', function (done) {
        topic1 = { ...header, serial: 1, title: 'First', text: '-' };
        topic2 = { /* missing header */ title: 'Second', text: '-' };
        topic3 = { ...header, serial: 3, title: 'Third', text: '-' };
        const ret = Topics.methods.batch.insert._execute({ userId }, { communityId,
          args: [topic1, topic2, topic3],
        });

        chai.assert.equal(ret.errors.length, 1);
        chai.assert.equal(ret.results.length, 2);
        doc1 = Topics.findOne({ title: 'First' });
        doc2 = Topics.findOne({ title: 'Second' });
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.isDefined(doc1);
        chai.assert.isUndefined(doc2);
        chai.assert.isDefined(doc3);
        done();
      });

    });
  });
}
