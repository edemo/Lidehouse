/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
// import { _ } from 'meteor/underscore';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  let userId;
  let communityId;

  before(function () {
    userId = Random.id();
    communityId = Factory.create('community')._id;
    Factory.create('membership', { userId, communityId });
  });

  describe('memberships', function () {

    describe('mutators', function () {
      it('builds correctly from factory', function () {
        const membership = Factory.create('membership', { userId });
        assert.typeOf(membership, 'object');
      });
    });

    describe('publications', function () {

      describe('memberships.inCommunity', function () {
        it('sends all memberships for your community', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'memberships.inCommunity',
            { communityId },
            (collections) => {
              chai.assert.isAbove(collections.memberships.length, 0);
              done();
            }
          );
        });
      });

      describe('memberships.ofUser', function () {
        it('sends all memberships for user', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'memberships.ofUser',
            { userId },
            (collections) => {
              chai.assert.isAbove(collections.memberships.length, 0);
              done();
            }
          );
        });
      });
    });
  });
}
