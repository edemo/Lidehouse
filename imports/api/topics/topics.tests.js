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
import { statusChange } from '/imports/api/topics/methods.js';
import { moment } from 'meteor/momentjs:moment';

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
      before(function () {
      });

      describe('topics.private', function () {
        it('sends all owned topics', function (done) {
          done();
        });
      });
    });

    describe('methods', function () {
      let topicId;
      let commentId;
      let otherTopicId;
      let userId;
      let otherUserId;

      describe('notifications', function () {
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
            status: 'opened',
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
            status: 'opened',
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

      describe('statusChange', function () {
        before(function () {
          // Clear
          Topics.remove({});
          Comments.remove({});

          // Create a ticket
          topicId = Topics.methods.insert._execute({ userId: otherUserId }, {
            communityId: Fixture.demoCommunityId,
            userId: otherUserId,
            category: 'ticket',
            ticket: {
              type: 'issue',
              urgency: 'normal',
            },
            status: 'reported',
            title: 'Just a ticket',
            text: 'Not much to say',
          });
        });

        it('doesn\'t let you change the status if you don\'t have the right permission', function (done) {
          chai.assert.throws(() => {
            const data = {
              localizer: 'At the basement',
              expectedCost: 5000,
              expectedStart: moment().toDate(),
              expectedFinish: moment().add(1, 'weeks').toDate(),
            };
            statusChange._execute({ userId }, { userId, topicId, type: 'statusChangeTo', status: 'confirmed', data });
          });
          done();
        });

        it('doesn\'t let you change the status outside the workflow', function (done) {
          chai.assert.throws(() => {
            const data = { expectedFinish: moment().add(1, 'weeks').toDate() };
            userId = Fixture.demoManagerId;
            statusChange._execute({ userId }, { userId, topicId, type: 'statusChangeTo', status: 'progressing', data });
          });
          done();
        });

        it('let you change the status inside the workflow', function (done) {
          const data = {
            localizer: 'At the basement',
            expectedCost: 5000,
            expectedStart: moment().toDate(),
            expectedFinish: moment().add(1, 'weeks').toDate(),
          };
          statusChange._execute({ userId }, { userId, topicId, type: 'statusChangeTo', status: 'confirmed', data });
          done();
        });
      });
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
    });
  });
}
