import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const Notifications = new Mongo.Collection('notifications');

Notifications.schema = new SimpleSchema({
  userId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  lastSeens: { type: Array, optional: true, autoform: { omit: true } },
  'lastSeens.$': { type: Object, blackbox: true, autoform: { omit: true } },
});

Notifications.attachSchema(Notifications.schema);

Notifications.allow({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
