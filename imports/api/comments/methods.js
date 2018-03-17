import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

import { Comments } from './comments.js';
import { Topics } from '../topics/topics.js';
import { checkExists, checkPermissions, checkModifier } from '../method-checks';

export const insert = new ValidatedMethod({
  name: 'comments.insert',
  validate: Comments.simpleSchema().validator({ clean: true }),

  run(doc) {
    const topic = checkExists(Topics, doc.topicId);
    checkPermissions(this.userId, 'comments.insert', topic.communityId);
    
    Comments.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'comments.update',
  validate: new SimpleSchema({
    commentId: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ commentId, modifier }) {
    const comment = checkExists(Comments, commentId);
    const topic = checkExists(Topics, comment.topicId);
    checkModifier(comment, modifier, ['text']);     // only the text can be modified
    checkPermissions(this.userId, 'comments.update', topic.communityId, comment);

    Comments.update(commentId, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'comments.remove',
  validate: new SimpleSchema({
    commentId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ commentId }) {
    const comment = checkExists(Comments, commentId);
    const topic = checkExists(Topics, comment.topicId);
    checkPermissions(this.userId, 'comments.remove', topic.communityId, comment);

    Comments.remove(commentId);
  },
});


export const like = new ValidatedMethod({
  name: 'like',
  validate: new SimpleSchema({
    coll: { type: String },
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
    userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ coll, id, userId }) {
    let collection;
    if (coll === 'topics') collection = Topics;
    else if (coll === 'comments') collection = Comments;
    const object = checkExists(collection, id);

    // toggle Like
    const index = _.indexOf(object.likes, userId);
    if (index >= 0) {
      collection.update(id, { $pull: { likes: userId } });
    } else {
      collection.update(id, { $push: { likes: userId } });
    }
  },
});

//--------------------------------------------------------

const COMMENTS_METHOD_NAMES = _.pluck([
  insert,
  update,
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
