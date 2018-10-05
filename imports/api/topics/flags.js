import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { _ } from 'meteor/underscore';
import { checkExists, checkPermissions } from '/imports/api/method-checks.js';
import { toggleElementInArray } from '/imports/api/utils.js';

import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';

export const flagsSchema = new SimpleSchema({
  flags: { type: Array, defaultValue: [], autoform: { omit: true } },
  'flags.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
});

export const flagsHelpers = {
  isFlaggedBy(userId) {
    return _.contains(this.flags, userId);
  },
  flagsCount() {
    return this.flags.length;
  },
  flaggedBy() {
    if (this.flagsCount() >= 2
      && this.flagsCount() >= this.likesCount()) {
      return 'community';
    }
    let result;
    this.flags.forEach((flag) => {
      const userId = flag;
      const user = Meteor.users.findOne(userId);
      if (user.hasPermission('topic.hide.forOthers', this.communityId)) result = 'moderator';
    });
    return result;
  },
};

export const flag = new ValidatedMethod({
  name: 'flag',
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

    checkPermissions(userId, 'flag.toggle', object.community()._id, object);

    // toggle Flag status of this user
    toggleElementInArray(collection, id, 'flags', userId);
  },
});
