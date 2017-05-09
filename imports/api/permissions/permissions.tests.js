/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
/*
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { Roles } from './roles.js';
import { Permissions } from './permissions.js';
*/

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  describe('roles', function () {
    describe('mutators', function () {
      it('builds correctly from factory', function () {
      });
    });

    before(function () {

    });

    describe('whatever', function () {
      it('soooo', function () {

      });
    });

    describe('publications', function () {
    });
  });
}
