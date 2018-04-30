import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

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
