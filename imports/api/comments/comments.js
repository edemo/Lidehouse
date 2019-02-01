import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Timestamps } from '/imports/api/timestamps.js';
import faker from 'faker';

import { MinimongoIndexing } from '/imports/startup/both/collection-index';
import { Topics } from '/imports/api/topics/topics.js';
import { likesSchema, likesHelpers } from '/imports/api/topics/likes.js';

class CommentsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const result = super.insert(doc, callback);
    Topics.update(doc.topicId, { $inc: { commentCounter: 1 } });
    return result;
  }
  update(selector, modifier, options, callback) {
    const result = super.update(selector, modifier, options, callback);
    return result;
  }
  remove(selector, callback) {
    const selection = this.find(selector);
    selection.forEach(comment => Topics.update(comment.topicId, { $inc: { commentCounter: -1 } }));
    const result = super.remove(selector, callback);
    return result;
  }
}

export const Comments = new CommentsCollection('comments');

Comments.schema = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, denyUpdate: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  text: { type: String, max: 5000, optional: true, autoform: { rows: 8 } },
  // For sharding purposes, lets have a communityId in every kind of document. even if its deducible
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id,
    autoValue() {
      const topicId = this.field('topicId').value;
      if (!this.isSet && topicId) {
        const topic = Topics.findOne(topicId);
        return topic.communityId;
      }
      return undefined; // means leave whats there alone for Updates, Upserts
    },
  },
});

Meteor.startup(function indexComments() {
  if (Meteor.isClient && MinimongoIndexing) {
    Comments._collection._ensureIndex('topicId');
  } else if (Meteor.isServer) {
    Comments._ensureIndex({ communityId: 1, topicId: 1, createdAt: -1 });
  }
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
