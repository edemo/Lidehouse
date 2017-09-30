/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { insert as insertDelegation, remove as removeDelegation, allow as allowDelegations } from './methods.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  const createDelegation = function (sourceId, targetId) {
    insertDelegation._execute({ userId: sourceId },
      { sourceUserId: sourceId, targetUserId: targetId, scope: 'community', objectId: Fixture.demoCommunityId }
    );
  }

  describe('delegations', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
      createDelegation(Fixture.dummyUsers[0], Fixture.dummyUsers[1]);
      createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
      createDelegation(Fixture.dummyUsers[2], Fixture.demoUserId);
      createDelegation(Fixture.demoUserId, Fixture.dummyUsers[3]);
      createDelegation(Fixture.demoUserId, Fixture.dummyUsers[4]);
    });

    describe('publications', function () {

      it('sends all delegations.fromUser', function (done) {
        const collector = new PublicationCollector({ userId: Fixture.demoUserId });
        collector.collect(
          'delegations.fromUser',
          { userId: Fixture.demoUserId },
          (collections) => {
            chai.assert.equal(collections.delegations.length, 2);
            chai.assert.equal(collections.users.length, 2);
            done();
          }
        );
      });

      it('sends all delegations.toUser', function (done) {
        const collector = new PublicationCollector({ userId: Fixture.demoUserId });
        collector.collect(
          'delegations.toUser',
          { userId: Fixture.demoUserId },
          (collections) => {
            chai.assert.equal(collections.delegations.length, 2);
            chai.assert.equal(collections.users.length, 2);
            done();
          }
        );
      });
    });

    describe('methods', function () {
      let delegationId;

      it('can insert delegations', function (done) {
        delegationId = insertDelegation._execute({ userId: Fixture.demoUserId },
          { sourceUserId: Fixture.demoUserId, targetUserId: Fixture.dummyUsers[0], scope: 'community', objectId: Fixture.demoCommunityId }
        );
        const delegation = Delegations.findOne(delegationId);
        chai.assert.isDefined(delegation);
        done();
      });

      it('scope is limited to community for now', function (done) {
        chai.assert.throws(() => {
          insertDelegation._execute({ userId: Fixture.demoUserId },
            { sourceUserId: Fixture.demoUserId, targetUserId: Fixture.dummyUsers[0], scope: 'topic' }
          );
        });
        done();
      });

      it('can update delegations', function (done) {
        // ??
        done();
      });

      it('can revoke delegations', function (done) {
        removeDelegation._execute({ userId: Fixture.demoUserId }, { _id: delegationId });
        const delegation = Delegations.findOne(delegationId);
        chai.assert.isUndefined(delegation);
        done();
      });

      it('can refuse delegations', function (done) {
        let delegation = Delegations.findOne({ sourceUserId: Fixture.dummyUsers[1], targetUserId: Fixture.demoUserId });
        chai.assert.isDefined(delegation);
        removeDelegation._execute({ userId: Fixture.demoUserId }, { _id: delegation._id });
        delegation = Delegations.findOne({ sourceUserId: Fixture.dummyUsers[1], targetUserId: Fixture.demoUserId });
        chai.assert.isUndefined(delegation);
        createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
        done();
      });

      it('can refuse all inbound delegations', function (done) {
        chai.assert.equal(Delegations.find({ targetUserId: Fixture.demoUserId }).fetch().length, 2);

        allowDelegations._execute({ userId: Fixture.demoUserId }, { value: false });
        chai.assert.equal(Delegations.find({ targetUserId: Fixture.demoUserId }).fetch().length, 0);

        // new delegations to him cannot be added now
        chai.assert.throws(() => {
          createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
        });
        chai.assert.equal(Delegations.find({ targetUserId: Fixture.demoUserId }).fetch().length, 0);

        // until he allows it again
        allowDelegations._execute({ userId: Fixture.demoUserId }, { value: true });
        createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
        createDelegation(Fixture.dummyUsers[2], Fixture.demoUserId);
        chai.assert.equal(Delegations.find({ targetUserId: Fixture.demoUserId }).fetch().length, 2);
        done();
      });

    });

    describe('permissions', function () {
      it('only allows to view the user\'s own delegations', function (done) {
        chai.assert.throws(() => {
          const collector = new PublicationCollector({ userId: Fixture.demoUserId });
          collector.collect(
            'delegations.toUser',
            { userId: Fixture.dummyUsers[0] },
            () => {},
          );
        });
        done();
      });

      it('only allows to insert the user\'s own outbound delegations', function (done) {
        chai.assert.throws(() => {
          insertDelegation._execute({ userId: Fixture.demoUserId },
            { sourceUserId: Fixture.dummyUsers[0], targetUserId: Fixture.demoUserId, scope: 'community', objectId: Fixture.demoCommunityId }
          );
        });
        done();
      });

      it('only allows to remove the user\'s own delegations', function (done) {
        const delegation = Delegations.findOne({ sourceUserId: Fixture.dummyUsers[0], targetUserId: Fixture.dummyUsers[1] });
        chai.assert.isDefined(delegation);
        chai.assert.throws(() => {
          removeDelegation._execute({ userId: Fixture.demoUserId }, { _id: delegation._id });
        });
        done();
      });
    });
  });
}
