/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
/*
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { Roles } from './roles.js';
*/
import { Permissions } from './permissions.js';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  xdescribe('permissions', function () {
    describe('mutators', function () {
      it('builds correctly from factory', function () {
      });
    });

    before(function () {

    });

    describe('Performance tests', function () {
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
