import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { debugAssert } from '/imports/utils/assert.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { Shareddocs, hasPermissionToUpload } from './shareddocs.js';

// Declare store collection
export const Sharedfolders = new Mongo.Collection('sharedfolders');

// Setting up collection permissions
Sharedfolders.allow({
  insert(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
  update(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
  remove(userId, doc) {
    return hasPermissionToUpload(userId, doc);
  },
});

Sharedfolders.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, denyUpdate: true, optional: true },
  name: { type: String },
});

Sharedfolders.attachSchema(Sharedfolders.schema);
Sharedfolders.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Sharedfolders.simpleSchema().i18n('schemaSharedfolders');
});
