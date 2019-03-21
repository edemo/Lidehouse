import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Factory } from 'meteor/dburles:factory';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Timestamps } from '/imports/api/timestamps.js';
import faker from 'faker';

import { MinimongoIndexing } from '/imports/startup/both/collection-index';
import { Topics } from '/imports/api/topics/topics.js';

export const Events = new Mongo.Collection('events');

Events.categoryValues = [/* comment, */'statusChange', 'pointAt'];

Events.baseSchema = new SimpleSchema({
  topicId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true }, denyUpdate: true },
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Events.categoryValues, autoform: { omit: true } },
  text: { type: String, max: 5000, optional: true, autoform: { rows: 8 } },
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true },
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

Events.schema = new SimpleSchema([Events.baseSchema, {
  data: { type: Object, blackbox: true, optional: true },
}]);

Meteor.startup(function indexComments() {
  if (Meteor.isClient && MinimongoIndexing) {
    Events._collection._ensureIndex('topicId');
  } else if (Meteor.isServer) {
    Events._ensureIndex({ communityId: 1, topicId: 1, createdAt: -1 });
  }
});

Events.attachSchema(Events.schema);
Events.attachSchema(Timestamps);

Events.helpers({
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
