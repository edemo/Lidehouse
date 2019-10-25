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
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { freshFixture, logDB } from '/imports/api/test-utils.js';
import { castVote, closeVote } from '/imports/api/topics/votings/methods.js';
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
    const comments = topic.comments().fetch(); // returns newest-first order
    const lastseenTimestamp = comments[0] ? comments[0].createdAt : topic.createdAt;
    const newLastSeenInfo = { timestamp: lastseenTimestamp };
    updateMyLastSeen._execute({ userId }, { topicId, lastSeenInfo: newLastSeenInfo });
  };

  describe('topics', function () {
    this.timeout(5000);
    before(function () {
      Fixture = freshFixture();
    });

    describe('publications', function () {
      let forumTopic;
      let roomTopic;
      let voteTopic;
      let maintainerId;
      let ownerId;
      let benefactorId;
      let adminId;
      let accountanId;
      let randomUserId;
      let communityId;

      before(function () {
        maintainerId = Fixture.dummyUsers[0];
        ownerId = Fixture.dummyUsers[1];
        benefactorId = Fixture.dummyUsers[2];
        adminId = Fixture.demoAdminId;
        accountanId = Fixture.dummyUsers[4];
        randomUserId = Random.id();
        communityId = Fixture.demoCommunityId;
        forumTopic = Factory.create('forum', { userId: maintainerId, communityId });
        roomTopic = Factory.create('room', { userId: ownerId, communityId, participantIds: [ownerId, randomUserId] });
        voteTopic = Factory.create('vote', { userId: ownerId, communityId });
        insertDelegation._execute(
          { userId: ownerId },
          { sourcePersonId: ownerId, targetPersonId: benefactorId, scope: 'community', scopeObjectId: communityId }
        );
        castVote._execute({ userId: benefactorId }, { topicId: voteTopic._id, castedVote: [0] });
        castVote._execute({ userId: accountanId }, { topicId: voteTopic._id, castedVote: [0] });


        _.times(3, () => {
          Factory.create('comment', { topicId: forumTopic._id, userId: maintainerId });
        });
        _.times(2, () => {
          Factory.create('comment', { topicId: roomTopic._id, userId: ownerId });
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
              chai.assert.deepEqual(collections.topics[0].voteCasts, { [benefactorId]: [0], [accountanId]: [0] });
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerId]: [0], [benefactorId]: [0], [accountanId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerId]: [ownerId, benefactorId], [benefactorId]: [benefactorId], [accountanId]: [accountanId] });
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
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerId]: [ownerId, benefactorId] });
              done();
            }
          );
        });

        it('sends voting details to admin, when vote is closed', function (done) {
          closeVote._execute({ userId: adminId }, { topicId: voteTopic._id });
          const collector = new PublicationCollector({ userId: adminId });
          collector.collect(
            'topics.byId',
            { _id: voteTopic._id },
            (collections) => {
              chai.assert.deepEqual(collections.topics[0].voteCasts, { [benefactorId]: [0], [accountanId]: [0] });
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerId]: [0], [benefactorId]: [0], [accountanId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerId]: [ownerId, benefactorId], [benefactorId]: [benefactorId], [accountanId]: [accountanId] });
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
              chai.assert.deepEqual(collections.topics[0].voteCasts, { [benefactorId]: [0], [accountanId]: [0] });
              chai.assert.deepEqual(collections.topics[0].voteCastsIndirect, { [ownerId]: [0], [benefactorId]: [0], [accountanId]: [0] });
              chai.assert.deepEqual(collections.topics[0].votePaths, { [ownerId]: [ownerId, benefactorId], [benefactorId]: [benefactorId], [accountanId]: [accountanId] });
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
      let otherUserId;

      describe('isUnseen', function () {
        before(function () {
          // Clear
          Topics.remove({});
          Comments.remove({});

          userId = Fixture.demoUserId;
          otherUserId = Fixture.demoManagerId;

          // Create a topic
          topicId = Topics.methods.insert._execute({ userId: otherUserId }, {
            communityId: Fixture.demoCommunityId,
            userId: otherUserId,
            category: 'forum',
            title: 'Just a topic',
            text: 'Not much to say',
          });
        });

        it('notifies on new topic', function (done) {
          const topic = Topics.findOne(topicId);
          chai.assert.isTrue(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          done();
        });

        it('doesn\'t notify on seen topic', function (done) {
          userHasNowSeen(userId, topicId);
          
          const topic = Topics.findOne(topicId);
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          done();
        });

        it('doesn\'t notify on own topic', function (done) {
          const myTopicId = Topics.methods.insert._execute({ userId }, {
            communityId: Fixture.demoCommunityId,
            userId,
            category: 'forum',
            title: 'This is my topic',
            text: 'My thoughts are here',
          });
          const topic = Topics.findOne(myTopicId);
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          done();
        });

        it('notifies on new comment', function (done) {
          Comments.methods.insert._execute({ userId: otherUserId }, { topicId, userId: otherUserId, text: 'comment 1' });

          const topic = Topics.findOne(topicId);
          chai.assert.isFalse(topic.isUnseenBy(userId, Meteor.users.SEEN_BY.NOTI));
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 1);
          const unseenComments = topic.unseenCommentListBy(userId, Meteor.users.SEEN_BY.NOTI);
          chai.assert.equal(unseenComments[0].text, 'comment 1');
          done();
        });

        it('doesn\'t notify on seen comment', function (done) {
          userHasNowSeen(userId, topicId);

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 0);
          done();
        });

        it('notifies on several new comments', function (done) {
          Comments.methods.insert._execute({ userId: otherUserId }, { topicId, userId: otherUserId, text: 'comment 2' });
          Comments.methods.insert._execute({ userId: otherUserId }, { topicId, userId: otherUserId, text: 'comment 3' });

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
          Comments.methods.remove._execute({ userId: otherUserId }, { _id: deleteComment._id });
          Comments.methods.insert._execute({ userId: otherUserId }, { topicId, userId: otherUserId, text: 'comment 4' });

          const topic = Topics.findOne(topicId);
          chai.assert.equal(topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.NOTI), 1);
          const unseenComments = topic.unseenCommentListBy(userId, Meteor.users.SEEN_BY.NOTI);
          chai.assert.equal(unseenComments[0].text, 'comment 4');
          done();
        });

        it('doesn\'t notify on own comment', function (done) {
          Comments.methods.insert._execute({ userId }, { topicId, userId, text: 'comment 5' });

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
