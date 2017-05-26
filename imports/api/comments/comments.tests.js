/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Factory } from 'meteor/dburles:factory';
import { PublicationCollector } from 'meteor/johanbrook:publication-collector';
import { chai, assert } from 'meteor/practicalmeteor:chai';
import { Random } from 'meteor/random';
import { _ } from 'meteor/underscore';

import { Comments } from './comments.js';

if (Meteor.isServer) {
  // eslint-disable-next-line import/no-unresolved
  import './publications.js';

  describe('comments', function () {
    describe('mutators', function () {
      it('builds correctly from factory', function () {
        const comment = Factory.create('comment');
        assert.typeOf(comment, 'object');
        assert.typeOf(comment.createdAt, 'date');
      });
    });

    it('leaves createdAt on update', function () {
      const createdAt = new Date(new Date() - 1000);
      let comment = Factory.create('comment', { createdAt });

      const text = 'some new text';
      Comments.update(comment, { $set: { text } });

      comment = Comments.findOne(comment._id);
      assert.equal(comment.text, text);
      assert.equal(comment.createdAt.getTime(), createdAt.getTime());
    });

    describe('publications', function () {
      let publicTopic;
      let privateTopic;
      let userId;

      before(function () {
        userId = Random.id();
        publicTopic = Factory.create('topic');
        privateTopic = Factory.create('topic', { userId });

        _.times(3, () => {
          Factory.create('comment', { topicId: publicTopic._id });
          // TODO get rid of userId, https://github.com/meteor/comments/pull/49
          Factory.create('comment', { topicId: privateTopic._id, userId });
        });
      });

      describe('comments.onTopic', function () {
        it('sends all comments for a public topic', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'comments.onTopic',
            { topicId: publicTopic._id },
            (collections) => {
              chai.assert.equal(collections.comments.length, 3);
              done();
            }
          );
        });

        it('sends all comments for a public topic when logged in', function (done) {
          const collector = new PublicationCollector({ userId });
          collector.collect(
            'comments.onTopic',
            { topicId: publicTopic._id },
            (collections) => {
              chai.assert.equal(collections.comments.length, 3);
              done();
            }
          );
        });

        it('sends all comments for a private topic when logged in as owner', function (done) {
          const collector = new PublicationCollector({ userId });
          collector.collect(
            'comments.onTopic',
            { topicId: privateTopic._id },
            (collections) => {
              chai.assert.equal(collections.comments.length, 3);
              done();
            }
          );
        });

        it('sends no comments for a private topic when not logged in', function (done) {
          const collector = new PublicationCollector();
          collector.collect(
            'comments.onTopic',
            { topicId: privateTopic._id },
            (collections) => {
              chai.assert.isUndefined(collections.comments);
              done();
            }
          );
        });

        it('sends no comments for a private topic when logged in as another user', function (done) {
          const collector = new PublicationCollector({ userId: Random.id() });
          collector.collect(
            'comments.onTopic',
            { topicId: privateTopic._id },
            (collections) => {
              chai.assert.isUndefined(collections.comments);
              done();
            }
          );
        });
      });
    });
  });
}
