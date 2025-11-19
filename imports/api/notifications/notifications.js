import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Notifications = new Mongo.Collection('notifications');

Notifications.schema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  lastSeens: { type: Array, autoform: { omit: true } },
  'lastSeens.$': { type: Object, blackbox: true, autoform: { omit: true } },  // topicId -> { timestamp: ... }
  lastTimeSeenAll: { type: Date, optional: true },
});

Notifications.attachSchema(Notifications.schema);

Meteor.startup(function indexNotifications() {
  if (Meteor.isServer) {
    Notifications._ensureIndex({ userId: 1 });
  }
});

Notifications.allow({
  insert(userId, doc) { return doc.userId === userId; },
  update(userId, doc) { return doc.userId === userId; },
  remove(userId, doc) { return doc.userId === userId; },
});
