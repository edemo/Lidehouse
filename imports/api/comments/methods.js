import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

import { Comments } from './comments.js';
import { Topics } from '../topics/topics.js';

export const insert = new ValidatedMethod({
  name: 'comments.insert',
  validate: Comments.simpleSchema().pick(['topicId', 'text']).validator({ clean: true, filter: false }),

  run({ topicId, text }) {
    const topic = Topics.findOne(topicId);

    if (topic.isPrivate() && topic.userId !== this.userId) {
      throw new Meteor.Error('comments.insert.accessDenied',
        'Cannot add comments to a private topic that is not yours');
    }

    const comment = {
      topicId,
      text,
      readed: false,
      createdAt: new Date(),
    };

    Comments.insert(comment);
  },
});

export const setReadedStatus = new ValidatedMethod({
  name: 'comments.makeReaded',
  validate: new SimpleSchema({
    commentId: Comments.simpleSchema().schema('_id'),
    newReadedStatus: Comments.simpleSchema().schema('readed'),
  }).validator({ clean: true, filter: false }),

  run({ commentId, newReadedStatus }) {
    const comment = Comments.findOne(commentId);

    if (comment.readed === newReadedStatus) {
      // The status is already what we want, let's not do any extra work
      return;
    }

    if (!comment.editableBy(this.userId)) {
      throw new Meteor.Error('comments.setReadedStatus.accessDenied',
        'Cannot edit readed status in a private topic that is not yours');
    }

    Comments.update(commentId, { $set: {
      readed: newReadedStatus,
    } });
  },
});

export const updateText = new ValidatedMethod({
  name: 'comments.updateText',
  validate: new SimpleSchema({
    commentId: Comments.simpleSchema().schema('_id'),
    newText: Comments.simpleSchema().schema('text'),
  }).validator({ clean: true, filter: false }),

  run({ commentId, newText }) {
    // This is complex auth stuff - perhaps denormalizing a userId onto comments
    // would be correct here?
    const comment = Comments.findOne(commentId);

    if (!comment.editableBy(this.userId)) {
      throw new Meteor.Error('comments.updateText.accessDenied',
        'Cannot edit comments in a private topic that is not yours');
    }

    Comments.update(commentId, {
      $set: {
        text: (_.isUndefined(newText) ? null : newText),
      },
    });
  },
});

export const remove = new ValidatedMethod({
  name: 'comments.remove',
  validate: new SimpleSchema({
    commentId: Comments.simpleSchema().schema('_id'),
  }).validator({ clean: true, filter: false }),

  run({ commentId }) {
    const comment = Comments.findOne(commentId);

    if (!comment.editableBy(this.userId)) {
      throw new Meteor.Error('comments.remove.accessDenied',
        'Cannot remove comments in a private topic that is not yours');
    }

    Comments.remove(commentId);
  },
});

const COMMENTS_METHOD_NAMES = _.pluck([
  insert,
  setReadedStatus,
  updateText,
  remove,
], 'name');

if (Meteor.isServer) {
  // Only allow 5 comments operations per connection per second
  DDPRateLimiter.addRule({
    name(name) {
      return _.contains(COMMENTS_METHOD_NAMES, name);
    },

    // Rate limit per connection ID
    connectionId() { return true; },
  }, 5, 1000);
}
