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

  describe('batch-method', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
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
      let doc1, doc2, doc3;
      
      it('inserts single', function (done) {
        const topic1 = Fixture.builder.build('ticket', { title: 'First', userId: Fixture.demoAdminId });
        Topics.methods.batch.insert._execute({ userId: Fixture.demoAdminId }, { communityId: Fixture.demoCommunityId,
          args: [topic1],
        });

        doc1 = Topics.findOne({ title: 'First' });
        chai.assert.isDefined(doc1);
        done();
      });

      it('inserts multiple', function (done) {
        const topic2 = Fixture.builder.build('ticket', { title: 'Second', userId: Fixture.demoAdminId });
        const topic3 = Fixture.builder.build('ticket', { title: 'Third', userId: Fixture.demoAdminId });
        Topics.methods.batch.insert._execute({ userId: Fixture.demoAdminId }, { communityId: Fixture.demoCommunityId,
          args: [topic2, topic3],
        });

        doc2 = Topics.findOne({ title: 'Second' });
        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.isDefined(doc2);
        chai.assert.isDefined(doc3);
        done();
      });

      it('updates single', function (done) {
        Topics.methods.batch.update._execute({ userId: Fixture.demoAdminId }, { communityId: Fixture.demoCommunityId,
          args: [
            { _id: doc3._id, modifier: { $set: { text: 'third' } } },
          ],
        });

        doc3 = Topics.findOne({ title: 'Third' });
        chai.assert.equal(doc3.text, 'third');
        done();
      });

      it('updates multiple', function (done) {
        Topics.methods.batch.update._execute({ userId: Fixture.demoAdminId }, { communityId: Fixture.demoCommunityId,
          args: [
            { _id: doc2._id, modifier: { $set: { text: 'second' } } },
            { _id: doc1._id, modifier: { $set: { text: 'first' } } },
          ],
        });

        doc2 = Topics.findOne({ title: 'Second' });
        doc1 = Topics.findOne({ title: 'First' });
        chai.assert.equal(doc2.text, 'second');
        chai.assert.equal(doc1.text, 'first');
        done();
      });

      it('removes multiple', function (done) {
        Topics.methods.batch.remove._execute({ userId: Fixture.demoAdminId }, { communityId: Fixture.demoCommunityId,
          args: [
            { _id: doc1._id },
            { _id: doc2._id },
            { _id: doc3._id },
          ],
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
        const topic1 = Fixture.builder.build('ticket', { title: 'First', userId: Fixture.demoAdminId });
        const topic2 = Fixture.builder.build('ticket', { title: 'Second', /* missing userId */ });
        const topic3 = Fixture.builder.build('ticket', { title: 'Third', userId: Fixture.demoAdminId });
        const ret = Topics.methods.batch.insert._execute({ userId: Fixture.demoAdminId }, { communityId: Fixture.demoCommunityId,
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
