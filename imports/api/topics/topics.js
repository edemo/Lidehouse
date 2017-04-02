import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import { TAPi18n } from 'meteor/tap:i18n';

import { Comments } from '../comments/comments.js';

class TopicsCollection extends Mongo.Collection {
  insert(topic, callback, language = 'en') {
    const ourTopic = topic;
    if (!ourTopic.name) {
      const defaultName = TAPi18n.__('topics.insert.topic', null, language);
      let nextLetter = 'A';
      ourTopic.name = `${defaultName} ${nextLetter}`;

      while (this.findOne({ name: ourTopic.name })) {
        // not going to be too smart here, can go past Z
        nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
        ourTopic.name = `${defaultName} ${nextLetter}`;
      }
    }

    return super.insert(ourTopic, callback);
  }
  remove(selector, callback) {
    Comments.remove({ topicId: selector });
    return super.remove(selector, callback);
  }
}

export const Topics = new TopicsCollection('topics');

// Deny all client-side updates since we will be using methods to manage this collection
Topics.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Topics.schema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  name: { type: String },
  incompleteCount: { type: Number, defaultValue: 0 },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true },
});

Topics.attachSchema(Topics.schema);

// This represents the keys from Topics objects that should be published
// to the client. If we add secret properties to Topic objects, don't list
// them here to keep them private to the server.
Topics.publicFields = {
  name: 1,
  incompleteCount: 1,
  userId: 1,
};

Factory.define('topic', Topics, {});

Topics.helpers({
  // A topic is considered to be private if it has a userId set
  isPrivate() {
    return !!this.userId;
  },
  isLastPublicTopic() {
    const publicTopicCount = Topics.find({ userId: { $exists: false } }).count();
    return !this.isPrivate() && publicTopicCount === 1;
  },
  editableBy(userId) {
    if (!this.userId) {
      return true;
    }

    return this.userId === userId;
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: -1 } });
  },
});
