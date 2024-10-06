/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { Random } from 'meteor/random';
import { DDP } from 'meteor/ddp-client';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { closeInactiveTopics } from '/imports/api/topics/methods.js';
import { Clock } from '/imports/utils/clock';

import { castVote } from '/imports/api/topics/votings/methods.js';
import { insert as insertDelegation } from '/imports/api/delegations/methods.js';
import '/i18n/en.i18n.json';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import { updateMyLastSeen } from '/imports/api/users/methods.js';
  import '/imports/api/comments/methods.js';
  import './methods.js';
  import './publications.js';

  let Fixture;
  // Mock version of the real client's helper function
  const userHasNowSeen = function (userId, topicId) {
    const topic = Topics.findOne(topicId);
    const lastComment = topic.comments().fetch()[0]; // returns newest-first order
    const lastseenTimestamp = lastComment ? lastComment.createdAt : topic.createdAt;
    const newLastSeenInfo = { timestamp: lastseenTimestamp };
    updateMyLastSeen._execute({ userId }, { topicId, lastSeenInfo: newLastSeenInfo });
  };

  describe('topics', function () {
    this.timeout(15000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {
      let forumTopic;
      let roomTopic;
      let voteTopic;
      let maintainerId;
      let ownerId;
      let ownerPartnerId;
      let benefactorId;
      let benefactorPartnerId;
      let adminId;
      let accountantId;
      let accountantPartnerId;
      let randomUserId;
      let communityId;

      before(function () {
        maintainerId = Fixture.dummyUsers[0];
        ownerId = Fixture.dummyUsers[3];
        ownerPartnerId = Fixture.partnerId(Fixture.dummyUsers[3]);
        benefactorId = Fixture.dummyUsers[2];
        benefactorPartnerId = Fixture.partnerId(Fixture.dummyUsers[2]);
        adminId = Fixture.demoAdminId;
        accountantId = Fixture.dummyUsers[4];
        accountantPartnerId = Fixture.partnerId(Fixture.dummyUsers[4]);
        randomUserId = Random.id();
        communityId = Fixture.demoCommunityId;
        forumTopic = Factory.create('forum', { creatorId: maintainerId, communityId });
        roomTopic = Factory.create('room', { creatorId: ownerId, communityId, participantIds: [ownerId, randomUserId] });
        voteTopic = Factory.create('vote', { creatorId: ownerId, communityId });
        insertDelegation._execute(
          { userId: ownerId },
          { sourceId: ownerPartnerId, targetId: benefactorPartnerId, scope: 'community', scopeObjectId: communityId }
        );
        castVote._execute({ userId: benefactorId }, { topicId: voteTopic._id, castedVote: [0] });
        castVote._execute({ userId: accountantId }, { topicId: voteTopic._id, castedVote: [0] });


        _.times(3, () => {
          Factory.create('comment', { topicId: forumTopic._id, creatorId: maintainerId });
        });
        _.times(2, () => {
          Factory.create('comment', { topicId: roomTopic._id, creatorId: ownerId });
        });
      });

      describe('topics.byId', function () {
        it('sends all public topics with comments when logged in', function (done) {
          const collector = new PublicationCollector({ userId: ownerId });
          collector.collect(
            'topics.byId',
            { _id: forumTopic._id },
            (collections) => {
              chai.assert.equal(collections.topics.length, 1);
              chai.assert.equal(collections.users.length, 1);
              chai.assert.equal(collections.comments.length, 3);
              done();
            }
          );
        });

        it('sends all private topics when logged in as a participant', function (done) {
          const collector = new PublicationCollector({ userId: ownerId });
          collector.collect(
            'topics.byId',
            { _id: roomTopic._id },
            (collections) => {
              chai.assert.equal(collections.topics.length, 1);
              chai.assert.equal(collections.users.length, 1);
              chai.assert.equal(collections.comments.length, 2);
              done();
            }
          );
        });

        it('sends no private topic when not logged in', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'topics.byId',
            { _id: roomTopic._id },
            (collections) => {
              chai.assert.isUndefined(collections.topics);
              chai.assert.isUndefined(collections.users);
              chai.assert.isUndefined(collections.comments);
              done();
            }
          );
        });

        it('sends no private topics when logged in as another user', function (done) {
          const collector = new PublicationCollector({ userId: maintainerId });
          collector.collect(
            'topics.byId',
            { _id: roomTopic._id },
            (collections) => {
              chai.assert.isUndefined(collections.topics);
              chai.assert.isUndefined(collections.users);
              chai.assert.isUndefined(collections.comments);
              done();
            }
          );
        });

        it('sends voting details to admin, when vote is open', function (done) {
          const collector = new PublicationCollector({ userId: adminId });
          collector.collect(
            'topics.byId',
            { _id: voteTopic._id },
            (collections) => {
              chai.assert.deepEqual(collections.topics[0].voteCasts, { [benefactorPartnerId]: [0], [accountantPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerPartnerId]: [0], [benefactorPartnerId]: [0], [accountantPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerPartnerId]: [ownerPartnerId, benefactorPartnerId], [benefactorPartnerId]: [benefactorPartnerId], [accountantPartnerId]: [accountantPartnerId] });
              done();
            }
          );
        });

        it('doesn\'t sends voting details to owner, when vote is open', function (done) {
          const collector = new PublicationCollector({ userId: ownerId });
          collector.collect(
            'topics.byId',
            { _id: voteTopic._id },
            (collections) => {
              chai.assert.deepEqual(collections.topics[0].voteCasts, {});
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerPartnerId]: [ownerPartnerId, benefactorPartnerId] });
              done();
            }
          );
        });

        it('sends voting details to admin, when vote is closed', function (done) {
          Topics.methods.statusChange._execute({ userId: adminId }, { topicId: voteTopic._id, status: 'votingFinished' });
          Topics.methods.statusChange._execute({ userId: adminId }, { topicId: voteTopic._id, status: 'closed' });
          const collector = new PublicationCollector({ userId: adminId });
          collector.collect(
            'topics.byId',
            { _id: voteTopic._id },
            (collections) => {
              chai.assert.deepEqual(collections.topics[0].voteCasts, { [benefactorPartnerId]: [0], [accountantPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerPartnerId]: [0], [benefactorPartnerId]: [0], [accountantPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerPartnerId]: [ownerPartnerId, benefactorPartnerId], [benefactorPartnerId]: [benefactorPartnerId], [accountantPartnerId]: [accountantPartnerId] });
              done();
            }
          );
        });

        it('sends voting details to owner, when vote is closed', function (done) {
          const collector = new PublicationCollector({ userId: ownerId });
          collector.collect(
            'topics.byId',
            { _id: voteTopic._id },
            (collections) => {
              chai.assert.deepEqual(collections.topics[0].voteCasts, { [benefactorPartnerId]: [0], [accountantPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerPartnerId]: [0], [benefactorPartnerId]: [0], [accountantPartnerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerPartnerId]: [ownerPartnerId, benefactorPartnerId], [benefactorPartnerId]: [benefactorPartnerId], [accountantPartnerId]: [accountantPartnerId] });
              done();
            }
          );
        });
      });
    });

    describe('methods', function () {
      let topicId;
      let commentId;
      let otherTopicId;
      let userId;
      let managerId;

      describe('isUnseen', function () {
        before(function () {
          // Clear
          Topics.remove({});
          Comments.remove({});

          userId = Fixture.demoUserId;
          managerId = Fixture.demoManagerId;

          // Create a topic
          topicId = Fixture.builder.create('forum', { creatorId: managerId });
        });

        it('notifies on new topic', function (done) {
          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.creatorId, managerId);
          chai.assert.isTrue(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isTrue(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          done();
        });

        it('doesn\'t notify on seen topic', function (done) {
          userHasNowSeen(userId, topicId);
          
          const topic = Topics.findOne(topicId);
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          done();
        });

        it('doesn\'t notify on own topic', function (done) {
          const myTopicId = Fixture.builder.create('forum', { creatorId: userId });
          const topic = Topics.findOne(myTopicId);
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          done();
        });

        it('notifies on new comment', function (done) {
          Fixture.builder.create('comment', {
            creatorId: managerId, topicId, text: 'comment 1' });

          const topic = Topics.findOne(topicId);
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 1);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 1);
          const unseenComments = topic.unseenCommentListBy(userId, Meteor.users.SEEN_BY.NOTI);
          chai.assert.equal(unseenComments[0].text, 'comment 1');
          done();
        });

        it('doesn\'t notify on seen comment', function (done) {
          userHasNowSeen(userId, topicId);

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 0);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 0);
          done();
        });

        it('notifies on several new comments', function (done) {
          Fixture.builder.create('comment', {
            creatorId: managerId, topicId, text: 'comment 2' });
          Fixture.builder.create('comment', {
            creatorId: managerId, topicId, text: 'comment 3' });

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 2);
          const unseenComments = topic.unseenCommentListBy(userId, Meteor.users.SEEN_BY.NOTI);
          chai.assert.equal(unseenComments[0].text, 'comment 2');
          chai.assert.equal(unseenComments[1].text, 'comment 3');
          done();
        });

        it('doesn\'t notify after several seen comment', function (done) {
          userHasNowSeen(userId, topicId);

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 0);
          done();
        });

        it('notifies on new comment even if meanwhile there is a deleted comment', function (done) {
          const deleteComment = Comments.findOne({ text: 'comment 3' });
          Fixture.builder.execute(Comments.methods.remove, { _id: deleteComment._id });
          Fixture.builder.create('comment', {
            creatorId: managerId, topicId, text: 'comment 4' });

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 1);
          const unseenComments = topic.unseenCommentListBy(userId, Meteor.users.SEEN_BY.NOTI);
          chai.assert.equal(unseenComments[0].text, 'comment 4');
          done();
        });

        it('doesn\'t notify on own comment', function (done) {
          Fixture.builder.create('comment', {
            creatorId: userId, topicId, text: 'comment 5' });

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 0);
          done();
        });

        it('notifies new users', function (done) {
          const newUserId = Accounts.createUser({ email: 'newuser@honline.hu', password: 'password' });

          const topic = Topics.findOne(topicId);
          chai.assert.isTrue(topic.isUnseenBy(newUserId, Meteor.users.SEEN_BY.NOTI));
          chai.assert.equal(topic.unseenCommentCountBy(newUserId, Meteor.users.SEEN_BY.NOTI), 4);
          const unseenComments = topic.unseenCommentListBy(newUserId, Meteor.users.SEEN_BY.NOTI);
          chai.assert.equal(unseenComments[0].text, 'comment 1');
          chai.assert.equal(unseenComments[1].text, 'comment 2');
          chai.assert.equal(unseenComments[2].text, 'comment 4');   // 3 was deleted
          chai.assert.equal(unseenComments[3].text, 'comment 5');
          done();
        });
      });

      describe('Move topic, comment, merge lastSeens', function () {
        let adminId;

        beforeEach(function () {
          Topics.remove({});
          Comments.remove({});

          userId = Fixture.demoUserId;
          managerId = Fixture.demoManagerId;
          adminId = Fixture.demoAdminId;

          topicId = Fixture.builder.create('forum', { creatorId: managerId });
          otherTopicId = Fixture.builder.create('forum', { creatorId: managerId });
        });

        it('unseen topic without comments goes to unseen topic without comments', function (done) {
          const topic1 = Topics.findOne(topicId);
          const topic2 = Topics.findOne(otherTopicId);
          chai.assert.isTrue(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isTrue(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          chai.assert.isTrue(topic2.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isTrue(topic2.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          Topics.methods.move._execute({ userId: adminId }, { _id: otherTopicId, destinationId: topicId });
          chai.assert.isTrue(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isTrue(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 1);
          done();
        });


        it('newer seen topic goes to unseen topic', function (done) {
          const topic1 = Topics.findOne(topicId);
          const topic2 = Topics.findOne(otherTopicId);
          userHasNowSeen(userId, otherTopicId);
          chai.assert.isTrue(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isFalse(topic2.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          Topics.methods.move._execute({ userId: adminId }, { _id: otherTopicId, destinationId: topicId });
          chai.assert.isFalse(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 0);
          done();
        });

        it('unseen topic goes to newer seen topic', function (done) {
          const topic1 = Topics.findOne(topicId);
          const topic2 = Topics.findOne(otherTopicId);
          userHasNowSeen(userId, otherTopicId);
          chai.assert.isTrue(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isFalse(topic2.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          Topics.methods.move._execute({ userId: adminId }, { _id: topicId, destinationId: otherTopicId });
          chai.assert.isFalse(topic2.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.equal(topic2.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 0);
          done();
        });

        it('unseen topic goes to older seen topic', function (done) {
          const topic1 = Topics.findOne(topicId);
          const topic2 = Topics.findOne(otherTopicId);
          userHasNowSeen(userId, topicId);
          chai.assert.isTrue(topic2.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.isFalse(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          Topics.methods.move._execute({ userId: adminId }, { _id: otherTopicId, destinationId: topicId });
          chai.assert.isFalse(topic1.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 1);
          done();
        });

        it('seen topic with unseen comments goes to newer seen topic without comments', function (done) {
          userHasNowSeen(userId, topicId);
          Fixture.builder.create('comment', { creatorId: managerId, topicId, text: 'comment 1' });
          const topic1 = Topics.findOne(topicId);
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 1);
          const topicId3 = Fixture.builder.create('forum', { creatorId: managerId });
          const topic3 = Topics.findOne(topicId3);
          userHasNowSeen(userId, topicId3);
          chai.assert.isFalse(topic3.isUnseenBy(userId, Meteor.users.SEEN_BY.EYES));
          Topics.methods.move._execute({ userId: adminId }, { _id: topicId3, destinationId: topicId });
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 2);
          done();
        });

        it('topic with seen comments goes to older topic with unseen comments', function (done) {
          userHasNowSeen(userId, topicId);
          Fixture.builder.create('comment', { creatorId: managerId, topicId, text: 'comment 1' });
          Fixture.builder.create('comment', { creatorId: managerId, topicId: otherTopicId, text: 'comment 2' });
          userHasNowSeen(userId, otherTopicId);
          const topic1 = Topics.findOne(topicId);
          const topic2 = Topics.findOne(otherTopicId);
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 1);
          chai.assert.equal(topic2.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 0);
          Topics.methods.move._execute({ userId: adminId }, { _id: otherTopicId, destinationId: topicId });
          chai.assert.equal(topic1.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES), 3);
          done();
        });

        /*
        'seen topic with older unseen comments' 'unseen topic newer'
        'seen topic with newer unseen comments' 'unseen topic older'
        'seen topic with older seen comments' 'unseen topic newer'
        'seen topic with newer seen comments' 'unseen topic older'
        'seen topic with newer unseen comments' 'seen topic with older unseen comments'
        'seen topic with older seen comments' 'seen topic with newer unseen comments'
        'seen topic with newer seen comments''seen topic with older unseen comments'
        'seen topic with older seen comments''seen topic with newer seen comments'
        */
      });

      describe('statusChange', function () {
        before(function () {
          // Clear
          Topics.remove({});
          Comments.remove({});

          // Create a ticket
          topicId = Fixture.builder.create('issue', { creatorId: managerId });
        });

        it('doesn\'t let you change the status if you don\'t have the right permission', function (done) {
          chai.assert.throws(() => {
            Fixture.builder.execute(Topics.methods.statusChange, {
              topicId, status: 'confirmed', dataUpdate: {} }, userId);  // user is just owner
          }, 'err_permissionDenied');
          done();
        });

        it('doesn\'t let you change the status outside the workflow', function (done) {
          chai.assert.throws(() => {
            const dataUpdate = { expectedContinue: moment().add(1, 'weeks').toDate() };
            Fixture.builder.execute(Topics.methods.statusChange, {
              topicId, status: 'suspended', dataUpdate });
          }, 'err_permissionDenied');
          done();
        });

        it('let you change the status inside the workflow', function (done) {
          const dataUpdate = {
            localizer: 'At the basement',
            expectedCost: 5000,
            expectedStart: moment().toDate(),
            expectedFinish: moment().add(1, 'weeks').toDate(),
          };
          Fixture.builder.execute(Topics.methods.statusChange, {
            topicId, status: 'confirmed', dataUpdate });
          done();
        });

        it('inserts an event', function (done) {
          const topic = Topics.findOne(topicId);
          const comment = Comments.findOne({ topicId: topic._id });
          chai.assert.deepEqual(topic._id, comment.topicId);
          done();
        });
      });

      describe('autoClose', function () {
        before(function () {
          Topics.remove({});
          userId = Fixture.dummyUsers[2];
        });

        it('closes old topics and only old ones', function (done) {
          Clock.setSimulatedTime(moment().subtract(14, 'month').toDate());
          topicId = Fixture.builder.create('forum', { creatorId: userId });
          otherTopicId = Fixture.builder.create('vote', { creatorId: Fixture.demoManagerId });
          const thirdTopicId = Fixture.builder.create('forum', { creatorId: userId });
          Clock.clear();
          Fixture.builder.create('comment', { creatorId: userId, topicId: thirdTopicId, text: 'comment' });
          chai.assert.equal(Topics.find({ status: 'closed' }).count(), 0);
          closeInactiveTopics();
          chai.assert.equal(Topics.find({ status: 'closed' }).count(), 1);
          chai.assert.equal(Topics.findOne(topicId).status, 'closed');
          chai.assert.equal(Topics.findOne(otherTopicId).status, 'opened');
          chai.assert.notEqual(Topics.findOne(thirdTopicId).status, 'closed');
          done();
        });

        it('does not close exception categories', function (done) {
          Clock.setSimulatedTime(moment().subtract(4, 'month').toDate());
          const ticketId = Fixture.builder.create('issue', { creatorId: userId });
          Clock.clear();
          chai.assert.equal(Topics.find({ status: 'closed' }).count(), 1);
          closeInactiveTopics();
          chai.assert.equal(Topics.find({ status: 'closed' }).count(), 1);
          chai.assert.notEqual(Topics.findOne(ticketId).status, 'closed');
          done();
        });
      });
    });
  });
}

      /*
      describe('rate limiting', function () {
        it('does not allow more than 5 operations rapidly', function () {
          const connection = DDP.connect(Meteor.absoluteUrl());

          _.times(5, () => {
            connection.call(insert.name, { language: 'en', communityId: Factory.create('community')._id });
          });

          assert.throws(() => {
            connection.call(insert.name, { language: 'en', communityId: Factory.create('community')._id });
          }, Meteor.Error, /too-many-requests/);

          connection.disconnect();
        });
      });
      */
