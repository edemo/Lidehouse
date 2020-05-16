/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { Memberships }from '/imports/api/memberships/memberships.js';
import { Partners }from '/imports/api/partners/partners.js';
import { insert as insertDelegation, update as updateDelegation, remove as removeDelegation, allow as allowDelegations } from './methods.js';

if (Meteor.isServer) {

  import './publications.js';

  let Fixture;

  const createDelegation = function (sourceUserId, targetUserId) {
    const sourceId = Fixture.partnerId(sourceUserId);
    const targetId = Fixture.partnerId(targetUserId);
    insertDelegation._execute({ userId: sourceUserId },
      { sourceId, targetId, scope: 'community', scopeObjectId: Fixture.demoCommunityId }
    );
  };

  describe('delegations', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
//      createDelegation(Fixture.dummyUsers[0], Fixture.dummyUsers[1]);
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
          { communityId: Fixture.demoCommunityId },
          (collections) => {
            chai.assert.equal(collections.delegations.length, 2);
            chai.assert.equal(collections.partners.length, 2);
            chai.assert.equal(collections.users.length, 2);
            done();
          }
        );
      });

      it('sends all delegations.toUser', function (done) {
        const collector = new PublicationCollector({ userId: Fixture.demoUserId });
        collector.collect(
          'delegations.toUser',
          { communityId: Fixture.demoCommunityId },
          (collections) => {
            chai.assert.equal(collections.delegations.length, 2);
            chai.assert.equal(collections.partners.length, 2);
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
          { sourceId: Fixture.partnerId(Fixture.demoUserId), targetId: Fixture.partnerId(Fixture.dummyUsers[0]), scope: 'community', scopeObjectId: Fixture.demoCommunityId },
        );
        const delegation = Delegations.findOne(delegationId);
        chai.assert.isDefined(delegation);
        done();
      });

      it('cannot insert invalid delegation', function (done) {
        chai.assert.throws(() => {
          insertDelegation._execute({ userId: Fixture.demoUserId },
            { sourceId: Fixture.partnerId(Fixture.demoUserId), targetId: Fixture.partnerId(Fixture.dummyUsers[0]), scope: 'invalid' }
          );
        }, 'validation-error');
        done();
      });

      it('can update delegations', function (done) {
        updateDelegation._execute({ userId: Fixture.demoUserId },
          { _id: delegationId, modifier: { $set: { targetId: Fixture.partnerId(Fixture.dummyUsers[3]) } } }
        );
        const delegation = Delegations.findOne(delegationId);
        chai.assert.equal(delegation.targetId, Fixture.partnerId(Fixture.dummyUsers[3]));
        done();
      });

      it('circular delegation does not cause problem', function (done) {
        updateDelegation._execute({ userId: Fixture.demoUserId },
          { _id: delegationId, modifier: { $set: { targetId: Fixture.partnerId(Fixture.dummyUsers[1]) } } }
        );
        const delegation = Delegations.findOne(delegationId);
        chai.assert.equal(delegation.targetId, Fixture.partnerId(Fixture.dummyUsers[1]));
        done();
      });

      it('self delegation not allowed', function (done) {
        chai.assert.throws(() => {
          updateDelegation._execute({ userId: Fixture.demoUserId },
            { _id: delegationId, modifier: { $set: { targetId: Fixture.partnerId(Fixture.demoUserId) } } }
          );
        }, 'err_sanityCheckFailed');
        done();
      });

      it('can revoke delegations', function (done) {
        removeDelegation._execute({ userId: Fixture.demoUserId }, { _id: delegationId });
        const delegation = Delegations.findOne(delegationId);
        chai.assert.isUndefined(delegation);
        done();
      });

      it('can refuse delegations', function (done) {
        let delegation = Delegations.findOne({ sourceId: Fixture.partnerId(Fixture.dummyUsers[1]), targetId: Fixture.partnerId(Fixture.demoUserId) });
        chai.assert.isDefined(delegation);
        removeDelegation._execute({ userId: Fixture.demoUserId }, { _id: delegation._id });
        delegation = Delegations.findOne({ sourceId: Fixture.partnerId(Fixture.dummyUsers[1]), targetId: Fixture.partnerId(Fixture.demoUserId) });
        chai.assert.isUndefined(delegation);
        createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
        done();
      });

      it('can refuse all inbound delegations', function (done) {
        chai.assert.equal(Delegations.find({ targetId: Fixture.partnerId(Fixture.demoUserId) }).fetch().length, 2);

        allowDelegations._execute({ userId: Fixture.demoUserId }, { value: false });
        chai.assert.equal(Delegations.find({ targetId: Fixture.partnerId(Fixture.demoUserId) }).fetch().length, 0);

        // new delegations to him cannot be added now
        chai.assert.throws(() => {
          createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
        }, 'err_otherPartyNotAllowed');
        chai.assert.equal(Delegations.find({ targetId: Fixture.partnerId(Fixture.demoUserId) }).fetch().length, 0);

        // until he allows it again
        allowDelegations._execute({ userId: Fixture.demoUserId }, { value: true });
        createDelegation(Fixture.dummyUsers[1], Fixture.demoUserId);
        createDelegation(Fixture.dummyUsers[2], Fixture.demoUserId);
        chai.assert.equal(Delegations.find({ targetId: Fixture.partnerId(Fixture.demoUserId) }).fetch().length, 2);
        done();
      });

      it('can handle delegation without registered user', function (done) {
        const noUserPartnerId = Memberships.findOne({ role: 'owner', userId: { $exists: false } }).partnerId;
        const noUserPartner = Partners.findOne(noUserPartnerId);
        chai.assert.isDefined(noUserPartner);
        chai.assert.isUndefined(noUserPartner.userId);
        delegationId = insertDelegation._execute({ userId: Fixture.demoUserId },
          { sourceId: Fixture.partnerId(Fixture.demoUserId), targetId: noUserPartnerId, scope: 'community', scopeObjectId: Fixture.demoCommunityId });
        let delegation = Delegations.findOne(delegationId);
        chai.assert.isDefined(delegation);
        removeDelegation._execute({ userId: Fixture.demoUserId }, { _id: delegationId });
        delegation = Delegations.findOne({ sourceId: Fixture.partnerId(Fixture.demoUserId), targetId: noUserPartnerId });
        chai.assert.isUndefined(delegation);

        const delegationFromPartnerId = insertDelegation._execute({ userId: Fixture.demoManagerId },
          { sourceId: noUserPartnerId, targetId: Fixture.partnerId(Fixture.dummyUsers[1]), scope: 'community', scopeObjectId: Fixture.demoCommunityId });
        let delegationFromPartner = Delegations.findOne(delegationFromPartnerId);
        chai.assert.isDefined(delegationFromPartner);
        chai.assert.equal(delegationFromPartner.targetId, Fixture.partnerId(Fixture.dummyUsers[1]));
        updateDelegation._execute({ userId: Fixture.demoManagerId },
          { _id: delegationFromPartnerId, modifier: { $set: { targetId: Fixture.partnerId(Fixture.dummyUsers[3]) } } });
        delegationFromPartner = Delegations.findOne(delegationFromPartnerId);
        chai.assert.equal(delegationFromPartner.targetId, Fixture.partnerId(Fixture.dummyUsers[3]));
        done();
      });

    });

    describe('permissions', function () {
      it('only allows to view the user\'s own delegations', function (done) {
        const collector = new PublicationCollector({ userId: Fixture.demoUserId });
        const partnerId = Fixture.partnerId(Fixture.demoUserId);
        collector.collect(
          'delegations.toUser',
          { communityId: Fixture.demoCommunityId },
          (collections) => {
            collections.delegations.forEach(delegation => chai.assert.equal(delegation.targetId, partnerId));
          },
        );
        done();
      });

      it('only allows to insert the user\'s own outbound delegations (unless manager)', function (done) {
        chai.assert.throws(() => {
          insertDelegation._execute({ userId: Fixture.demoUserId },
            { sourceId: Fixture.partnerId(Fixture.dummyUsers[0]), targetId: Fixture.partnerId(Fixture.demoUserId), scope: 'community', scopeObjectId: Fixture.demoCommunityId }
          );
        }, 'err_permissionDenied');
        chai.assert.doesNotThrow(() => {
          insertDelegation._execute({ userId: Fixture.demoManagerId },
            { sourceId: Fixture.partnerId(Fixture.dummyUsers[0]), targetId: Fixture.partnerId(Fixture.demoUserId), scope: 'community', scopeObjectId: Fixture.demoCommunityId }
          );
        });
        done();
      });

      it('only allows to remove the user\'s own delegations (unless manager)', function (done) {
        const delegation = Delegations.findOne({ sourceId: Fixture.partnerId(Fixture.dummyUsers[0]), targetId: Fixture.partnerId(Fixture.demoUserId) });
        chai.assert.isDefined(delegation);
        chai.assert.throws(() => {
          removeDelegation._execute({ userId: Fixture.dummyUsers[1] }, { _id: delegation._id });
        }, 'err_permissionDenied');
        chai.assert.doesNotThrow(() => removeDelegation._execute({ userId: Fixture.demoManagerId }, { _id: delegation._id }));
        done();
      });
    });
  });
}
