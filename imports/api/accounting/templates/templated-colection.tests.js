/* eslint-env mocha */
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { _ } from 'meteor/underscore';

import { TemplatedMongoCollection } from '/imports/api/accounting/templates/templated-collection.js';

if (Meteor.isServer) {

  describe('templated-collection', function () {
    this.timeout(15000);
    let communityId;
    let templateId;
    let things;
    before(function () {
      communityId = new Mongo.ObjectID().toString();
      templateId = new Mongo.ObjectID().toString();
      things = new TemplatedMongoCollection('things', 'code');
      things.insert({ communityId: templateId, code: '`', name: 'COA' });
      things.insert({ communityId: templateId, code: '`1', name: '1 from template' });
      things.insert({ communityId: templateId, code: '`12', name: '12 from template' });
      things.insert({ communityId: templateId, code: '`12A', name: '12A from template' });
      things.insert({ communityId: templateId, code: '`12B', name: '12B from template' });
      things.insert({ communityId: templateId, code: '`19', name: '19 from template' });
      things.insert({ communityId: templateId, code: '`19A', name: '19A from template' });

      things.insert({ communityId, code: '`12B', name: '12B from community' });
      things.insert({ communityId, code: '`12C', name: '12C from community' });
      things.insert({ communityId, code: '`19', name: '19 from community' });
    });
    after(function () {
    });

    describe('api', function () {
      it('findOneT', function () {
        chai.assert.equal(things.findOneT({ communityId, templateId, code: '`1' }).name, '1 from template');
        chai.assert.equal(things.findOneT({ communityId, templateId, code: '`12B' }).name, '12B from community');
        chai.assert.equal(things.findOneT({ communityId, templateId, code: '`12C' }).name, '12C from community');
        chai.assert.equal(things.findOneT({ communityId, templateId, code: '`19' }).name, '19 from community');
        chai.assert.equal(things.findOneT({ communityId, templateId, code: '`19A' }).name, '19A from template');
      });

      it('findT', function () {
        chai.assert.equal(things.findT({ communityId, templateId, code: '`1' }).count(), 1);
        chai.assert.equal(things.findT({ communityId, templateId, code: '`12B' }).count(), 2);
        chai.assert.equal(things.findT({ communityId, templateId, code: '`12C' }).count(), 1);
        chai.assert.equal(things.findT({ communityId, templateId, code: '`19' }).count(), 2);
        chai.assert.equal(things.findT({ communityId, templateId, code: '`19A' }).count(), 1);
      });

      it('findTfetch', function () {
        chai.assert.equal(things.findTfetch({ communityId, templateId }).length, 8);
        const sub12 = things.findTfetch({ communityId, templateId, code: new RegExp('^`12') });
        chai.assert.deepEqual(_.pluck(sub12, 'code'), ['`12', '`12A', '`12B', '`12C']);
        chai.assert.equal(sub12[0].communityId, templateId);
        chai.assert.equal(sub12[1].communityId, templateId);
        chai.assert.equal(sub12[2].communityId, communityId);
        chai.assert.equal(sub12[3].communityId, communityId);
      });
    });
  });
}
