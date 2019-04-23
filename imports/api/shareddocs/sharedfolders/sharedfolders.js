import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Timestamps } from '/imports/api/timestamps.js';

// Declare store collection
export const Sharedfolders = new Mongo.Collection('sharedfolders');

// Setting up collection permissions
Sharedfolders.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});


Sharedfolders.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  name: { type: String },
});

Sharedfolders.attachSchema(Sharedfolders.schema);
Sharedfolders.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Sharedfolders.simpleSchema().i18n('schemaSharedfolders');
});
