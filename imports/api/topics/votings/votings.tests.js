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
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/votings/votings.js';
import { insert as insertTopic } from '/imports/api/topics/methods.js';
import { insert as insertDelegation, remove as removeDelegation } from '/imports/api/delegations/methods.js';
import { castVote } from '/imports/api/topics/votings/methods.js';

if (Meteor.isServer) {
  let Fixture;
  const createVoting = function (type) {
    return {
      communityId: Fixture.demoCommunityId,
      userId: Fixture.demoUserId,
      category: 'vote',
      title: `${type} Voting`,
      text: 'Choose!',
      vote: {
        closesAt: moment().add(14, 'day').toDate(),
        procedure: 'online',
        effect: 'legal',
        type,
        choices: ['white', 'red', 'yellow', 'grey'],
      },
    };
  };

  describe('votings', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('permissions', function () {
      let votingId;

      it('can create new voting', function (done) {
        votingId = insertTopic._execute({ userId: Fixture.demoManagerId }, createVoting('yesno'));
        chai.assert.isDefined(votingId);
        const voting = Topics.findOne(votingId);
        chai.assert.equal(voting._id, votingId);
        done();
      });

      it('cannot create new voting without permission', function (done) {
        chai.assert.throws(() => {
          votingId = insertTopic._execute({ userId: Fixture.demoUserId }, createVoting('yesno'));
        });
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
    });

    describe('evaluation', function () {
      let votingId;

      before(function () {
        votingId = insertTopic._execute({ userId: Fixture.demoManagerId }, createVoting('yesno'));
      });

      it('no evaluation on fresh voting', function (done) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 0, units: 0 });
        chai.assert.isUndefined(voting.voteCasts);
        chai.assert.isUndefined(voting.voteCastsIndirect);
        chai.assert.isUndefined(voting.voteResults);
        chai.assert.isUndefined(voting.voteSummary);
        done();
      });

      const assertsAfterFirstVote = function (choice = 1) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 1, units: 10 });
        const castsShouldBe = {};
        castsShouldBe[Fixture.dummyUsers[1]] = [choice];
        chai.assert.deepEqual(voting.voteCasts, castsShouldBe);
        chai.assert.deepEqual(voting.voteCastsIndirect, castsShouldBe);
        chai.assert.equal(_.keys(voting.voteResults).length, 1);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[1]].votingShare, new Fraction(10, 100));
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[1]].voteResult, [choice]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[1]].votePath, [Fixture.dummyUsers[1]]);
        const summaryShouldBe = {};
        summaryShouldBe[choice] = 10;
        chai.assert.deepEqual(voting.voteSummary, summaryShouldBe);
      };

      const assertsAfterSecondVote = function (choice = 2) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 2, units: 30 });
        const castsShouldBe = {};
        castsShouldBe[Fixture.dummyUsers[1]] = [1];
        castsShouldBe[Fixture.dummyUsers[2]] = [choice];
        chai.assert.deepEqual(voting.voteCasts, castsShouldBe);
        chai.assert.deepEqual(voting.voteCastsIndirect, castsShouldBe);
        chai.assert.equal(_.keys(voting.voteResults).length, 2);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[1]].votingShare, new Fraction(10, 100));
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[1]].voteResult, [1]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[1]].votePath, [Fixture.dummyUsers[1]]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[2]].votingShare, new Fraction(20, 100));
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[2]].voteResult, [choice]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[2]].votePath, [Fixture.dummyUsers[2]]);
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

      const assertsAfterIndirectVote = function (choice = 0) {
        const voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 4, units: 100 });
        const castsShouldBe = {};
        castsShouldBe[Fixture.dummyUsers[1]] = [1];
        castsShouldBe[Fixture.dummyUsers[2]] = [2];
        castsShouldBe[Fixture.dummyUsers[3]] = [choice];
        chai.assert.deepEqual(voting.voteCasts, castsShouldBe);
        castsShouldBe[Fixture.dummyUsers[4]] = [choice];
        chai.assert.deepEqual(voting.voteCastsIndirect, castsShouldBe);
        chai.assert.equal(_.keys(voting.voteResults).length, 4);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[3]].votingShare, new Fraction(30, 100));
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[3]].voteResult, [choice]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[3]].votePath, [Fixture.dummyUsers[3]]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[4]].votingShare, new Fraction(40, 100));
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[4]].voteResult, [choice]);
        chai.assert.deepEqual(voting.voteResults[Fixture.dummyParcels[4]].votePath, [Fixture.dummyUsers[4], Fixture.dummyUsers[3]]);
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
        let voting;
        // New delegation 4 => 3 (delegatee has not voted yet)
        const delegationId = insertDelegation._execute(
          { userId: Fixture.dummyUsers[4] },
          { sourcePersonId: Fixture.dummyUsers[4], targetPersonId: Fixture.dummyUsers[3], scope: 'community', scopeObjectId: Fixture.demoCommunityId }
        );
        assertsAfterSecondVote();

        // Delegatee votes
        castVote._execute({ userId: Fixture.dummyUsers[3] }, { topicId: votingId, castedVote: [0] });
        console.log(Topics.findOne(votingId).voteResults);
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

        voting = Topics.findOne(votingId);
        chai.assert.deepEqual(voting.voteParticipation, { count: 3, units: 60 });
        chai.assert.deepEqual(voting.voteCasts[Fixture.dummyUsers[3]], [0]);
        chai.assert.isUndefined(voting.voteCasts[Fixture.dummyUsers[4]]);
        chai.assert.isUndefined(voting.voteCastsIndirect[Fixture.dummyUsers[4]]);

        done();
      });

      // TODO: ownership changes during vote period

    });
  });
}
