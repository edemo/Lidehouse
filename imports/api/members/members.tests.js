/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
// import { _ } from 'meteor/underscore';

// import { Members } from './members.js';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './server/publications.js';

  let userId;

  before(function () {
    userId = Random.id();
  });

  describe('members', function () {
    describe('mutators', function () {
      it('builds correctly from factory', function () {
        const member = Factory.create('member', { userId, username: 'dummy' });
        assert.typeOf(member, 'object');
      });
    });

    describe('publications', function () {
      describe('members.inCommunity', function () {
        it('sends all members for your community', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'members.inCommunity',
            { userId },
            (collections) => {
              chai.assert.isAbove(collections.members.length, 0);
              done();
            }
          );
        });
      });
    });
  });
}
