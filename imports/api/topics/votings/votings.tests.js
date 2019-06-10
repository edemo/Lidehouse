/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback, padded-blocks */

import { Meteor } from 'meteor/meteor';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { Fraction } from 'fractional';
import { moment } from 'meteor/momentjs:moment';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';
import '/imports/api/users/users.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Agendas } from '/imports/api/agendas/agendas.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/topics/votings/votings.js';
import { insert as insertAgenda } from '/imports/api/agendas/methods.js';
import { insert as insertTopic, update as updateTopic } from '/imports/api/topics/methods.js';
import { insert as insertDelegation, remove as removeDelegation } from '/imports/api/delegations/methods.js';
import { castVote } from '/imports/api/topics/votings/methods.js';

if (Meteor.isServer) {
  let Fixture;
  describe('votings', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('permissions', function () {
      let votingId;

      it('can create new voting', function (done) {
        votingId = insertTopic._execute({ userId: Fixture.demoManagerId },
          Fixture.builder.build('vote', { userId: Fixture.demoManagerId })
        );
        chai.assert.isDefined(votingId);
        const voting = Topics.findOne(votingId);
        chai.assert.equal(voting._id, votingId);
        done();
      });

      it('cannot create new legal voting without permission', function (done) {
        const voting = Fixture.builder.build('vote', { userId: Fixture.demoUserId });
        voting.vote.effect = 'legal';
        chai.assert.throws(() => {
          insertTopic._execute({ userId: Fixture.demoUserId }, voting);
        });
        // polls on the other hand are allowed to be created by everybody
        voting.vote.effect = 'poll';
        insertTopic._execute({ userId: Fixture.demoUserId }, voting);
        done();
      });

      it('can vote', function (done) {
        castVote._execute({ userId: Fixture.demoUserId }, { topicId: votingId, castedVote: [0] });

        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteCasts[Fixture.demoUserId], [0]);
        done();
      });

      it('others can vote', function (done) {
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
        castVote._execute({ userId: Fixture.dummyUsers[2] }, { topicId: votingId, castedVote: [2] });
        castVote._execute({ userId: Fixture.dummyUsers[3] }, { topicId: votingId, castedVote: [3] });

        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[1]], [1]);
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[2]], [2]);
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[3]], [3]);
        done();
      });

      it('only admin can vote in the name of others', function (done) {
        chai.assert.throws(() => {
          castVote._execute({ userId: Fixture.demoUserId }, { topicId: votingId, castedVote: [0], voters: [Fixture.dummyUsers[1]] });
        });
        castVote._execute({ userId: Fixture.demoAdminId }, { topicId: votingId, castedVote: [0], voters: [Fixture.dummyUsers[1], Fixture.dummyUsers[2], Fixture.dummyUsers[3]] });

        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[1]], [0]);
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[2]], [0]);
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[3]], [0]);
        done();
      });
    });

    describe('evaluation', function () {
      let votingId;
      let agendaId;

      before(function () {
        agendaId = insertAgenda._execute({ userId: Fixture.demoManagerId }, {
          communityId: Fixture.demoCommunityId,
          title: 'Test Agenda',
        });
        const voting = Fixture.builder.build('vote', {
          userId: Fixture.demoManagerId,
          agendaId,
        });
        voting.vote.type = 'yesno';
        votingId = insertTopic._execute({ userId: Fixture.demoManagerId }, voting);
      });

      it('no evaluation on fresh voting', function (done) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 0, units: 0 });
        chai.assert.deepEqual(voting.voteCasts, {});
        chai.assert.deepEqual(voting.voteCastsIndirect, {});
        chai.assert.deepEqual(voting.voteResults, {});
        chai.assert.deepEqual(voting.voteSummary, {});
        done();
      });

      const assertsAfterFirstVote = function (choice = 1) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 1, units: 10 });
        const castsShouldBe = {};
        const membership = Memberships.findOne({ parcelId: Fixture.dummyParcels[1] });
        castsShouldBe[Fixture.dummyUsers[1]] = [choice];
        chai.assert.deepEqual(voting.voteCasts, castsShouldBe);
        chai.assert.deepEqual(voting.voteCastsIndirect, castsShouldBe);
        chai.assert.equal(_.keys(voting.voteResults).length, 1);
        chai.assert.deepEqual(voting.voteResults[membership._id].votingShare, 10);
        chai.assert.deepEqual(voting.voteResults[membership._id].castedVote, [choice]);
        chai.assert.deepEqual(voting.voteResults[membership._id].votePath, [Fixture.dummyUsers[1]]);
        const summaryShouldBe = {};
        summaryShouldBe[choice] = 10;
        chai.assert.deepEqual(voting.voteSummary, summaryShouldBe);
      };

      const assertsAfterSecondVote = function (choice = 2) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 2, units: 30 });
        const castsShouldBe = {};
        const membership = Memberships.findOne({ parcelId: Fixture.dummyParcels[1] });
        const membership2 = Memberships.findOne({ parcelId: Fixture.dummyParcels[2], 'ownership.representor': true });
        castsShouldBe[Fixture.dummyUsers[1]] = [1];
        castsShouldBe[Fixture.dummyUsers[2]] = [choice];
        chai.assert.deepEqual(voting.voteCasts, castsShouldBe);
        chai.assert.deepEqual(voting.voteCastsIndirect, castsShouldBe);
        chai.assert.equal(_.keys(voting.voteResults).length, 2);
        chai.assert.deepEqual(voting.voteResults[membership._id].votingShare, 10);
        chai.assert.deepEqual(voting.voteResults[membership._id].castedVote, [1]);
        chai.assert.deepEqual(voting.voteResults[membership._id].votePath, [Fixture.dummyUsers[1]]);
        chai.assert.deepEqual(voting.voteResults[membership2._id].votingShare, 20);
        chai.assert.deepEqual(voting.voteResults[membership2._id].castedVote, [choice]);
        chai.assert.deepEqual(voting.voteResults[membership2._id].votePath, [Fixture.dummyUsers[2]]);
        const summaryShouldBe = {};
        if (choice === 1) {
          summaryShouldBe[1] = 30;
        } else if (choice === 2) {
          summaryShouldBe[1] = 10;
          summaryShouldBe[2] = 20;
        }
        chai.assert.deepEqual(voting.voteSummary, summaryShouldBe);
      };


      it('evaluates well on direct votes', function (done) {
        // First vote
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
        assertsAfterFirstVote(1);

        // Repeted vote
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
        assertsAfterFirstVote(1);

        // Changed vote
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [2] });
        assertsAfterFirstVote(2);

        // Revoked vote
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [] });
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 0, units: 0 });
        chai.assert.deepEqual(voting.voteCasts, {});
        chai.assert.deepEqual(voting.voteCastsIndirect, {});
        chai.assert.deepEqual(voting.voteResults, {});
        chai.assert.deepEqual(voting.voteSummary, {});

        // Reinstated vote
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
        assertsAfterFirstVote();

        // Second vote
        castVote._execute({ userId: Fixture.dummyUsers[2] }, { topicId: votingId, castedVote: [1] });
        assertsAfterSecondVote(1);

        // Repeated vote
        castVote._execute({ userId: Fixture.dummyUsers[2] }, { topicId: votingId, castedVote: [1] });
        assertsAfterSecondVote(1);

        // Changed vote
        castVote._execute({ userId: Fixture.dummyUsers[2] }, { topicId: votingId, castedVote: [2] });
        assertsAfterSecondVote(2);

        // Revoked vote
        castVote._execute({ userId: Fixture.dummyUsers[2] }, { topicId: votingId, castedVote: [] });
        assertsAfterFirstVote(1);

        // Reinstated vote
        castVote._execute({ userId: Fixture.dummyUsers[2] }, { topicId: votingId, castedVote: [2] });
        assertsAfterSecondVote();

        done();
      });

      const assertsAfterThirdVote = function (choice = 0) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 3, units: 60 });
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[3]], [choice]);
        chai.assert.isUndefined(voting.voteCasts[Fixture.dummyUsers[4]]);
      };

      const assertsAfterIndirectVote = function (choice = 0) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 4, units: 100 });
        const castsShouldBe = {};
        const membership3 = Memberships.findOne({ parcelId: Fixture.dummyParcels[3] }); // there is no representor
        const membership4 = Memberships.findOne({ parcelId: Fixture.dummyParcels[4], 'ownership.representor': true });
        castsShouldBe[Fixture.dummyUsers[1]] = [1];
        castsShouldBe[Fixture.dummyUsers[2]] = [2];
        castsShouldBe[Fixture.dummyUsers[3]] = [choice];
        chai.assert.deepEqual(voting.voteCasts, castsShouldBe);
        castsShouldBe[Fixture.dummyUsers[4]] = [choice];
        chai.assert.deepEqual(voting.voteCastsIndirect, castsShouldBe);
        chai.assert.equal(_.keys(voting.voteResults).length, 4);
        chai.assert.deepEqual(voting.voteResults[membership3._id].votingShare, 30);
        chai.assert.deepEqual(voting.voteResults[membership3._id].castedVote, [choice]);
        chai.assert.deepEqual(voting.voteResults[membership3._id].votePath, [Fixture.dummyUsers[3]]);
        chai.assert.deepEqual(voting.voteResults[membership4._id].votingShare, 40);
        chai.assert.deepEqual(voting.voteResults[membership4._id].castedVote, [choice]);
        chai.assert.deepEqual(voting.voteResults[membership4._id].votePath, [Fixture.dummyUsers[4], Fixture.dummyUsers[3]]);
        const summaryShouldBe = {};
        if (choice === 0) {
          summaryShouldBe[1] = 10;
          summaryShouldBe[2] = 20;
          summaryShouldBe[0] = 70;
        } else if (choice === 1) {
          summaryShouldBe[1] = 80;
          summaryShouldBe[2] = 20;
        }
        chai.assert.deepEqual(voting.voteSummary, summaryShouldBe);
      };

      it('evaluates well on indirect votes', function (done) {
        // New delegation 4 => 3 (delegatee has not voted yet)
        const delegationId = insertDelegation._execute(
          { userId: Fixture.dummyUsers[4] },
          { sourcePersonId: Fixture.dummyUsers[4], targetPersonId: Fixture.dummyUsers[3], scope: 'community', scopeObjectId: Fixture.demoCommunityId }
        );
        assertsAfterSecondVote();

        // Delegatee votes
        castVote._execute({ userId: Fixture.dummyUsers[3] }, { topicId: votingId, castedVote: [0] });
        assertsAfterIndirectVote(0);

        // Delegatee changes vote
        castVote._execute({ userId: Fixture.dummyUsers[3] }, { topicId: votingId, castedVote: [1] });
        assertsAfterIndirectVote(1);

        // Delegatee revokes vote
        castVote._execute({ userId: Fixture.dummyUsers[3] }, { topicId: votingId, castedVote: [] });
        assertsAfterSecondVote();

        // Delegatee reinstates vote
        castVote._execute({ userId: Fixture.dummyUsers[3] }, { topicId: votingId, castedVote: [0] });
        assertsAfterIndirectVote();

        // Delegation revoked
        removeDelegation._execute({ userId: Fixture.dummyUsers[4] }, { _id: delegationId });
        // TODO it doesnt come into effect until SOME vote is cast
        castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [0] });

        assertsAfterThirdVote();

        done();
      });

      it('evaluates well on different delegation scopes', function (done) {
        let delegationId;
        function insertDelegation3To4(scope, scopeObjectId) {
          delegationId = insertDelegation._execute(
            { userId: Fixture.dummyUsers[4] },
            { sourcePersonId: Fixture.dummyUsers[4], targetPersonId: Fixture.dummyUsers[3], scope, scopeObjectId }
          );
          // TODO it doesnt come into effect until SOME vote is cast
          castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
        }
        function revokeDelegation3To4(scope, scopeObjectId) {
          removeDelegation._execute(
            { userId: Fixture.dummyUsers[4] }, { _id: delegationId }
          );
          // TODO it doesnt come into effect until SOME vote is cast
          castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
        }

        assertsAfterThirdVote();

        insertDelegation3To4('community', Fixture.demoCommunityId);
        assertsAfterIndirectVote();
        revokeDelegation3To4();
        assertsAfterThirdVote();

        console.log(agendaId, Agendas.findOne({ _id: { $ne: agendaId } }));
        insertDelegation3To4('agenda', Agendas.findOne({ _id: { $ne: agendaId } })._id);
        console.log(JSON.stringify(Topics.findOne(votingId)));
        assertsAfterThirdVote();  // no effect here
        revokeDelegation3To4();
        assertsAfterThirdVote();

        insertDelegation3To4('agenda', agendaId);
        assertsAfterIndirectVote();
        revokeDelegation3To4();
        assertsAfterThirdVote();

        insertDelegation3To4('topic', Topics.findOne({ _id: { $ne: votingId } })._id);
        assertsAfterThirdVote();  // no effect here
        revokeDelegation3To4();
        assertsAfterThirdVote();

        insertDelegation3To4('topic', votingId);
        assertsAfterIndirectVote();
        revokeDelegation3To4();
        assertsAfterThirdVote();

        done();
      });

      describe('multiChoose evaluation', function () {

        before(function () {
          const voting = Fixture.builder.build('vote', { userId: Fixture.demoManagerId });
          voting.vote.type = 'multiChoose';
          votingId = insertTopic._execute({ userId: Fixture.demoManagerId }, voting);
        });

        it('evaluates correct vote summary on multiChoose vote', function (done) {
          chai.assert.isDefined(votingId);
          castVote._execute({ userId: Fixture.dummyUsers[1] }, { topicId: votingId, castedVote: [1] });
          castVote._execute({ userId: Fixture.dummyUsers[4] }, { topicId: votingId, castedVote: [0, 1] });
          const updatedVoting = Topics.findOne(votingId);
          chai.assert.deepEqual(updatedVoting.voteSummary, { 0: 40, 1: 50 });
          done();
        });

      });

        // TODO: ownership changes during vote period

    });
  });
}
