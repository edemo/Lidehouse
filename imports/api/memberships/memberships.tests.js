/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { freshFixture, logDB } from '/imports/api/test-utils.js';

import { Communities } from '/imports/api/communities/communities.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('memberships', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {

      describe('memberships.inCommunity', function () {
        it('sends all memberships for your community', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'memberships.inCommunity',
            { communityId: Fixture.demoCommunityId },
            (collections) => {
              chai.assert.equal(collections.memberships.length, 11);
              chai.assert.equal(collections.parcels.length, 5);
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
            { userId: Fixture.demoUserId },
            (collections) => {
              chai.assert.equal(collections.memberships.length, 2);
              chai.assert.equal(collections.communities.length, 1);
              done();
            }
          );
        });
      });
    });
  });
}
