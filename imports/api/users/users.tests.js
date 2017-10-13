/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { Fraction } from 'fractional';

import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { insert as insertMembership, update as updateMembership, remove as removeMembership  } from '/imports/api/memberships/methods.js';
import { everybody } from '/imports/api/permissions/config.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import '/imports/api/users/users.js'

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  describe('users', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {
    });

    describe('permissions', function () {

      // TODO: Can change identity data before connected to any community
      // TODO: Cannot change identity data after connected to a community
    });

    describe('certification', function () {
//      const community = Communities.findOne(Fixture.demoCommunityId);
      const admin = 0;
      const manager = 0;

// scenario A1: 1. user creates account, 2. user asks to join community, 3. manager approves (no certification yet) 4. later certification happens
// scenario A2: 1. user creates account, 2. user meets with manager and there he adds him to community (certified)
// scenario B1: 1. manager creates an identity to be used in the system
//                 (no intention to create user account later - can be used to list parcel owner or register in person votes)
// scenario B2: 1. manager creates an identity and an account for user 2. adds him to community 3. invites him to this account 4. user later accepts
// scenario BONUS: user changes his email address after all this, or during the process

      it('scenario A1', function (done) {
        // 1. user creates account
        const userId = Accounts.createUser({ email: 'user@test.com', password: 'password' });
        // 2. user asks to join community

        // 3. manager approves (no certification yet)

        // 4. later certification happens

        done();
      });
    });
  });
}
