import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { _ } from 'meteor/underscore';
import { checkExists } from '/imports/api/method-checks.js';

import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';

export const likesSchema = new SimpleSchema({
  likes: { type: Array, defaultValue: [], autoform: { omit: true } },
  'likes.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
});

export const likesHelpers = {
  isLikedBy(userId) {
    return _.contains(this.likes, userId);
  },
  likesCount() {
    return this.likes.length;
  },
  /* To update, you need to call the 'like' meteormethod
  toggleLike(userId) {
    const index = _.indexOf(this.likes, userId);
    if (index >= 0) this.likes.splice(index, 1);
    else this.likes.push(userId);
  },*/
};

export const like = new ValidatedMethod({
  name: 'like',
  validate: new SimpleSchema({
    coll: { type: String },
    id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ coll, id }) {
    let collection;
    if (coll === 'topics') collection = Topics;
    else if (coll === 'comments') collection = Comments;
    const object = checkExists(collection, id);
    const userId = this.userId;

    // toggle Like
    const index = _.indexOf(object.likes, userId);
    if (index >= 0) {
      collection.update(id, { $pull: { likes: userId } });
    } else {
      collection.update(id, { $push: { likes: userId } });
    }
  },
});
