import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Timestamps } from '../timestamps.js';
import faker from 'faker';
import unreadCountDenormalizer from './unreadCountDenormalizer.js';

import { Topics } from '../topics/topics.js';

class CommentsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const result = super.insert(doc, callback);
    unreadCountDenormalizer.afterInsertComment(doc);
    return result;
  }
  update(selector, modifier) {
    const result = super.update(selector, modifier);
    unreadCountDenormalizer.afterUpdateComment(selector, modifier);
    return result;
  }
  remove(selector) {
    const comments = this.find(selector).fetch();
    const result = super.remove(selector);
    unreadCountDenormalizer.afterRemoveComments(comments);
    return result;
  }
}

export const Comments = new CommentsCollection('comments');

Comments.schema = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, denyUpdate: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  text: { type: String, optional: true },
  readed: { type: Boolean, defaultValue: false },
});

Comments.attachSchema(Comments.schema);
Comments.attachSchema(Timestamps);

Comments.helpers({
  user() {
    return Meteor.users.findOne(this.userId);
  },
  topic() {
    return Topics.findOne(this.topicId);
  },
  editableBy(userId) {
    return this.userId === userId;
  },
});

// Deny all client-side updates since we will be using methods to manage this collection
Comments.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// TODO This factory has a name - do we have a code style for this?
//   - usually I've used the singular, sometimes you have more than one though, like
//   'comment', 'emptyComment', 'readedComment'
Factory.define('comment', Comments, {
  topicId: () => Factory.get('topic'),
  text: () => faker.lorem.sentence(),
  createdAt: () => new Date(),
});
