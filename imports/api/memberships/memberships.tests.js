/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
// import { _ } from 'meteor/underscore';

// import { Memberships } from './memberships.js';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  let userId;

  before(function () {
    userId = Random.id();
  });

  describe('memberships', function () {
    describe('mutators', function () {
      it('builds correctly from factory', function () {
        const membership = Factory.create('membership', { userId, username: 'dummy' });
        assert.typeOf(membership, 'object');
      });
    });

    describe('publications', function () {
      describe('memberships.inCommunity', function () {
        it('sends all memberships for your community', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'memberships.inCommunity',
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
