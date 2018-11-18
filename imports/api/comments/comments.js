import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Timestamps } from '/imports/api/timestamps.js';
import faker from 'faker';

import { Topics } from '/imports/api/topics/topics.js';
import { likesSchema, likesHelpers } from '/imports/api/topics/likes.js';

class CommentsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const result = super.insert(doc, callback);
    Topics.update(doc.topicId, { $inc: { commentCounter: 1 } });
    // NOTE: the commentCounter does NOT decrease when a comment is removed
    // this is so that we are notified on new comments, even if some old comments were removed meanwhile
    return result;
  }
  update(selector, modifier, options, callback) {
    const result = super.update(selector, modifier, options, callback);
    return result;
  }
  remove(selector, callback) {
    const result = super.remove(selector, callback);
    return result;
  }
}

export const Comments = new CommentsCollection('comments');

Comments.schema = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, denyUpdate: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  text: { type: String, optional: true },
  // For sharding purposes, lets have a communityId in every kind of document. even if its deducible
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true,
    autoValue() {
      const topicId = this.field('topicId').value;
      const topic = Topics.find(topicId);
      return topic.communityId;
    },
  },
});

Comments.attachSchema(Comments.schema);
Comments.attachSchema(likesSchema);
Comments.attachSchema(Timestamps);

Comments.helpers({
  user() {
    return Meteor.users.findOne(this.userId);
  },
  topic() {
    return Topics.findOne(this.topicId);
  },
  community() {
    return this.topic().community();
  },
  editableBy(userId) {
    return this.userId === userId;
  },
});

Comments.helpers(likesHelpers);


// TODO This factory has a name - do we have a code style for this?
//   - usually I've used the singular, sometimes you have more than one though, like
//   'comment', 'emptyComment', 'readedComment'
Factory.define('comment', Comments, {
  topicId: () => Factory.get('topic'),
  text: () => faker.lorem.sentence(),
  createdAt: () => new Date(),
});
