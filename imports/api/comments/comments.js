import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';

import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Likeable } from '/imports/api/behaviours/likeable.js';
import { Flagable } from '/imports/api/behaviours/flagable.js';
import { Topics } from '/imports/api/topics/topics.js';

export const Comments = new Mongo.Collection('comments');

Comments.typeValues = ['statusChangeTo', 'pointAt'];

Comments.rawSchema = {
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, denyUpdate: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // deprecated for creatorId
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
  topic() {
    return Topics.findOne(this.topicId);
  },
  community() {
    return this.topic().community();
  },
  hiddenBy(userId, communityId) {
    const author = this.creator();
    return this.flaggedBy(userId, communityId) || (author && author.flaggedBy(userId, communityId));
  },
  getType() {
    return this.type || 'comment';
  },
});

// --- Before/after actions ---
if (Meteor.isServer) {
  Comments.after.insert(function (userId, doc) {
    Topics.update(doc.topicId, { $inc: { commentCounter: 1 } });
  });

  Comments.after.remove(function (userId, doc) {
    Topics.update(doc.topicId, { $inc: { commentCounter: -1 } });
  });
}

Factory.define('comment', Comments, {
  text: () => faker.lorem.sentence(),
});
