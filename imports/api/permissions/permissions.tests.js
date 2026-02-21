/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Factory } from 'meteor/dburles:factory';
// import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { Roles } from './roles.js';
import { Permissions } from './permissions.js';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  let Fixture;
  let communityId;
  let parcelId;
  let admin;
  let manager;
  let owner;

  describe('permissions', function () {
    this.timeout(150000);
    before(function () {
      Fixture = freshFixture();
      communityId = Fixture.demoCommunityId;
      parcelId = Fixture.dummyParcels[0];
      admin = Meteor.users.findOne(Fixture.demoAdminId);
      manager = Meteor.users.findOne(Fixture.demoManagerId);
      owner = Meteor.users.findOne(Fixture.demoUserId);
    });

    describe('users api', function () {
      it('Determines user`s roles', function () {
        chai.assert.isTrue(admin.hasRole('admin', communityId));
        chai.assert.isTrue(manager.hasRole('manager', communityId));
        chai.assert.isFalse(admin.hasRole('manager', communityId));
        chai.assert.isFalse(manager.hasRole('admin', communityId));
        chai.assert.isFalse(owner.hasRole('manager', communityId));
      });

      it('Determines user`s non-parcelscoped permissions', function () {
        const meterId = Fixture.builder.create('meter', { parcelId });
        const meter = Mongo.Collection.get('meters').findOne(meterId);

        chai.assert.isTrue(admin.hasPermission('meters.update', meter));
        chai.assert.isTrue(manager.hasPermission('meters.update', meter));
        chai.assert.isFalse(owner.hasPermission('meters.update', meter));
      });

      it('Determines user`s parcelscoped permissions', function () {
        const meterId = Fixture.builder.create('meter', { parcelId });
        const meter = Mongo.Collection.get('meters').findOne(meterId);
        const otherOwner = Meteor.users.findOne(Fixture.dummyUsers[2]);

        chai.assert.isTrue(owner.hasPermission('meters.registerReading.unapproved', meter));
        chai.assert.isFalse(otherOwner.hasPermission('meters.registerReading.unapproved', meter));
      });

      it('Determines author permissions', function () {
        const topicId = Fixture.builder.create('vote', { creatorId: owner._id });
        const topic = Mongo.Collection.get('topics').findOne(topicId);
        const otherOwner = Meteor.users.findOne(Fixture.dummyUsers[2]);

        chai.assert.isFalse(manager.hasPermission('vote.update', topic));
        chai.assert.isTrue(owner.hasPermission('vote.update', topic));
        chai.assert.isFalse(otherOwner.hasPermission('vote.update', topic));
      });
    });

    xdescribe('Performance tests', function () {
      let PermissionsColl;
      before(function () {
        PermissionsColl = new Mongo.Collection('permissions');
        PermissionsColl._ensureIndex({ name: 1 });
        for (let i = 10000; i < 10200; i++) {
          PermissionsColl.insert({ name: i.toString() });
        }
      });

      it('searching in Array', function () {
        const permissionName = 'attachments.remove';
        for (let i = 0; i < 1000; i++) {
          Permissions.find(p => p.name === permissionName);
        }
      });

      it('searching in Collection', function () {
        const permissionName = '10148';
        for (let i = 0; i < 1000; i++) {
          PermissionsColl.findOne({ name: permissionName });
        }
      });
    });

    describe('publications', function () {
    });
  });
}
