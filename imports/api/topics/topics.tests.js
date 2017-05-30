/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { DDP } from 'meteor/ddp-client';
import { Topics } from './topics.js';
import { insert, makePublic, makePrivate, updateName, remove } from './methods.js';
import { Comments } from '../comments/comments.js';
import '../../../i18n/en.i18n.json';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  describe('topics', function () {
    describe('mutators', function () {
      it('builds correctly from factory', function () {
        const topic = Factory.create('topic');
        assert.typeOf(topic, 'object');
        assert.match(topic.title, /Topic /);
      });
    });

    describe('publications', function () {
      const userId = Random.id();
      const communityId = Factory.create('community')._id;

      // TODO -- make a `topicWithComments` factory
      const createTopic = (props = {}) => {
        const topic = Factory.create('topic', _.extend(props, { communityId }));
        _.times(3, () => {
          Factory.create('comment', { topicId: topic._id });
        });
      };

      before(function () {
        Topics.remove({});
        _.times(3, () => createTopic());
        _.times(2, () => createTopic({ userId }));
        _.times(2, () => createTopic({ userId: Random.id() }));
      });


      describe('topics.public', function () {
        it('sends all public topics', function (done) {
          const collector = new PublicationCollector();
          collector.collect('topics.public', { communityId }, (collections) => {
            chai.assert.equal(collections.topics.length, 3);
            done();
          });
        });
      });

      describe('topics.private', function () {
        it('sends all owned topics', function (done) {
          const collector = new PublicationCollector({ userId });
          collector.collect('topics.private', { communityId }, (collections) => {
            chai.assert.equal(collections.topics.length, 2);
            done();
          });
        });
      });
    });

    describe('methods', function () {
      let topicId;
      let commentId;
      let otherTopicId;
      let userId;

      beforeEach(function () {
        // Clear
        Topics.remove({});
        Comments.remove({});

        // Create a topic and a comment in that topic
        topicId = Factory.create('topic')._id;
        commentId = Factory.create('comment', { topicId })._id;

        // Create throwaway topic, since the last public topic can't be made private
        otherTopicId = Factory.create('topic')._id;

        // Generate a 'user'
        userId = Random.id();
      });

      describe('makePrivate / makePublic', function () {
        function assertTopicAndCommentArePrivate() {
          assert.equal(Topics.findOne(topicId).userId, userId);
          assert.isTrue(Topics.findOne(topicId).isPrivate());
          assert.isTrue(Comments.findOne(commentId).editableBy(userId));
          assert.isFalse(Comments.findOne(commentId).editableBy(Random.id()));
        }

        it('makes a topic private and updates the comments', function () {
          // Check initial state is public
          assert.isFalse(Topics.findOne(topicId).isPrivate());

          // Set up method arguments and context
          const methodInvocation = { userId };
          const args = { topicId };

          // Making the topic private adds userId to the comment
          makePrivate._execute(methodInvocation, args);
          assertTopicAndCommentArePrivate();

          // Making the topic public removes it
          makePublic._execute(methodInvocation, args);
          assert.isUndefined(Comments.findOne(commentId).userId);
          assert.isTrue(Comments.findOne(commentId).editableBy(userId));
        });

        it('only works if you are logged in', function () {
          // Set up method arguments and context
          const methodInvocation = { };
          const args = { topicId };

          assert.throws(() => {
            makePrivate._execute(methodInvocation, args);
          }, Meteor.Error, /topics.makePrivate.notLoggedIn/);

          assert.throws(() => {
            makePublic._execute(methodInvocation, args);
          }, Meteor.Error, /topics.makePublic.notLoggedIn/);
        });

        it('only works if it\'s not the last public topic', function () {
          // Remove other topic, now we're the last public topic
          Topics.remove(otherTopicId);

          // Set up method arguments and context
          const methodInvocation = { userId };
          const args = { topicId };

          assert.throws(() => {
            makePrivate._execute(methodInvocation, args);
          }, Meteor.Error, /topics.makePrivate.lastPublicTopic/);
        });

        it('only makes the topic public if you made it private', function () {
          // Set up method arguments and context
          const methodInvocation = { userId };
          const args = { topicId };

          makePrivate._execute(methodInvocation, args);

          const otherUserMethodInvocation = { userId: Random.id() };

          // Shouldn't do anything
          assert.throws(() => {
            makePublic._execute(otherUserMethodInvocation, args);
          }, Meteor.Error, /topics.makePublic.accessDenied/);

          // Make sure things are still private
          assertTopicAndCommentArePrivate();
        });
      });

      describe('updateName', () => {
        it('changes the name, but not if you don\'t have permission', function () {
          updateName._execute({}, {
            topicId,
            newName: 'new name',
          });

          assert.equal(Topics.findOne(topicId).name, 'new name');

          // Make the topic private
          makePrivate._execute({ userId }, { topicId });

          // Works if the owner changes the name
          updateName._execute({ userId }, {
            topicId,
            newName: 'new name 2',
          });

          assert.equal(Topics.findOne(topicId).name, 'new name 2');

          // Throws if another user, or logged out user, tries to change the name
          assert.throws(() => {
            updateName._execute({ userId: Random.id() }, {
              topicId,
              newName: 'new name 3',
            });
          }, Meteor.Error, /topics.updateName.accessDenied/);

          assert.throws(() => {
            updateName._execute({}, {
              topicId,
              newName: 'new name 3',
            });
          }, Meteor.Error, /topics.updateName.accessDenied/);

          // Confirm name didn't change
          assert.equal(Topics.findOne(topicId).name, 'new name 2');
        });
      });

      describe('remove', function () {
        it('does not delete the last public topic', function () {
          const methodInvocation = { userId };

          // Works fine
          remove._execute(methodInvocation, { topicId: otherTopicId });

          // Should throw because it is the last public topic
          assert.throws(() => {
            remove._execute(methodInvocation, { topicId });
          }, Meteor.Error, /topics.remove.lastPublicTopic/);
        });

        it('does not delete a private topic you don\'t own', function () {
          // Make the topic private
          makePrivate._execute({ userId }, { topicId });

          // Throws if another user, or logged out user, tries to delete the topic
          assert.throws(() => {
            remove._execute({ userId: Random.id() }, { topicId });
          }, Meteor.Error, /topics.remove.accessDenied/);

          assert.throws(() => {
            remove._execute({}, { topicId });
          }, Meteor.Error, /topics.remove.accessDenied/);
        });
      });

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
    });
  });
}
