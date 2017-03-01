import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import faker from 'faker';
import unreadCountDenormalizer from './unreadCountDenormalizer.js';

import { Topics } from '../topics/topics.js';

class CommentsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const ourDoc = doc;
    ourDoc.createdAt = ourDoc.createdAt || new Date();
    const result = super.insert(ourDoc, callback);
    unreadCountDenormalizer.afterInsertComment(ourDoc);
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
  _id: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  topicId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    denyUpdate: true,
  },
  text: {
    type: String,
    optional: true,
  },
  createdAt: {
    type: Date,
    denyUpdate: true,
  },
  readed: {
    type: Boolean,
    defaultValue: false,
  },
});

Comments.attachSchema(Comments.schema);

Comments.helpers({
  topic() {
    return Topics.findOne(this.topicId);
  },
  editableBy(userId) {
    return this.topic().editableBy(userId);
  },
});

// Deny all client-side updates since we will be using methods to manage this collection
Comments.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// This represents the keys from Topics objects that should be published
// to the client. If we add secret properties to Topic objects, don't list
// them here to keep them private to the server.
Comments.publicFields = {
  topicId: 1,
  text: 1,
  createdAt: 1,
  readed: 1,
};

// TODO This factory has a name - do we have a code style for this?
//   - usually I've used the singular, sometimes you have more than one though, like
//   'comment', 'emptyComment', 'readedComment'
Factory.define('comment', Comments, {
  topicId: () => Factory.get('topic'),
  text: () => faker.lorem.sentence(),
  createdAt: () => new Date(),
});
