import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-index';
import { Topics } from '/imports/api/topics/topics.js';
import { Likeable } from '/imports/api/behaviours/likeable.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';

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

Comments.typeValues = ['statusChangeTo', 'pointAt'];

Comments.rawSchema = {
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, denyUpdate: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  type: { type: String, optional: true, allowedValues: Comments.typeValues, autoform: { omit: true } },
  status: { type: String, optional: true, autoform: { omit: true } },
  text: { type: String, max: 5000, optional: true, autoform: { rows: 8 } },
  data: { type: Object, blackbox: true, optional: true },
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
};

Comments.schema = new SimpleSchema(Comments.rawSchema);

Meteor.startup(function indexComments() {
  if (Meteor.isClient && MinimongoIndexing) {
    Comments._collection._ensureIndex('topicId');
  } else if (Meteor.isServer) {
    Comments._ensureIndex({ communityId: 1, topicId: 1, createdAt: -1 });
  }
});

Comments.attachSchema(Comments.schema);
Comments.attachBehaviour(Timestamped);
Comments.attachBehaviour(Likeable);
Comments.attachBehaviour(Flagable);

Comments.helpers({
  user() {
    return Meteor.users.findOne(this.userId);
  },
  createdBy() {
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
  hiddenBy(userId, communityId) {
    const author = this.createdBy();
    return this.flaggedBy(userId, communityId) || (author && author.flaggedBy(userId, communityId));
  },
  getType() {
    return this.type || 'comment';
  },
});

Factory.define('comment', Comments, {
  topicId: () => Factory.get('topic'),
  text: () => faker.lorem.sentence(),
});
