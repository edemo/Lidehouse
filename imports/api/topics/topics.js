import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { Timestamps } from '/imports/api/timestamps.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/users/users.js';

class TopicsCollection extends Mongo.Collection {
  insert(topic, callback) {
    return super.insert(topic, callback);
  }
  remove(selector, callback) {
    Comments.remove({ topicId: selector });
    return super.remove(selector, callback);
  }
}

export const Topics = new TopicsCollection('topics');

Topics.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  createdBy() {
    return Meteor.users.findOne(this.userId);
  },
  editableBy(userId) {
    if (!this.userId) { return true; }
    return this.userId === userId;
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: -1 } });
  },
});

Topics.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  participantIds: { type: Array, optional: true },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
  category: { type: String, allowedValues: ['forum', 'vote', 'news', 'ticket', 'room'] },
  title: { type: String, max: 100, optional: true },
  text: { type: String, max: 5000, optional: true },
  closed: { type: Boolean, defaultValue: false },
});

Topics.attachSchema(Topics.schema);
Topics.attachSchema(Timestamps);

// Deny all client-side updates since we will be using methods to manage this collection
Topics.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// This represents the keys from Topics objects that should be published to the client.
// If we add secret properties to Topic objects, don't list them here to keep them private to the server.
Topics.publicFields = {
  communityId: 1,
  userId: 1,
  category: 1,
  title: 1,
  text: 1,
  createdAt: 1,
  closed: 1,
};

Factory.define('topic', Topics, {
  communityId: () => Factory.get('community'),
});
