/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Fraction } from 'fractional';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { officerRoles } from '/imports/api/permissions/roles.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/methods.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('communities', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {

    });

    describe('API', function () {
      beforeEach(function () {
        Fixture = freshFixture();
      });
      afterEach(function () {
      });

      it('remove - cannot remove a community with active officer roles', function (done) {
        chai.assert.throws(
          () => Fixture.builder.execute(Communities.methods.remove, { _id: Fixture.demoCommunityId }, Fixture.builder.getUserWithRole('admin')),
          'Community cannot be deleted while it has active officers',
        );
        done();
      });

      it('remove - removes all associated documents', function (done) {
        Memberships.remove({ communityId: Fixture.demoCommunityId, role: { $ne: 'admin' } });
        Fixture.builder.execute(Communities.methods.remove, { _id: Fixture.demoCommunityId }, Fixture.builder.getUserWithRole('admin'));

        chai.assert.isUndefined(Communities.findOne(Fixture.demoCommunityId));
        Mongo.Collection.getAll().forEach((collection) => {
          chai.assert.isUndefined(collection.instance.findOne({ communityId: Fixture.demoCommunityId }));
        });

        done();
      });

    });

    describe('permissions', function () {
    });

    describe('sanity', function () {
    });
  });
}
