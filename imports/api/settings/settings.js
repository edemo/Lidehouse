import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { debugAssert } from '/imports/utils/assert.js';

let getDefaultSelector;
if (Meteor.isClient) {
  import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
  getDefaultSelector = () => ({ userId: Meteor.userId(), communityId: getActiveCommunityId() });
} else {
  getDefaultSelector = () => debugAssert(false, 'On the server side, you need to supply a setting selector');
}

export const Settings = new Mongo.Collection('settings');

Meteor.startup(function indexSettings() {
  Settings.ensureIndex({ userId: 1, communityId: 1 });
});

Settings.get = function get(name, selector = getDefaultSelector()) {
  const setting = Settings.findOne(selector);
  if (!setting) return undefined;
  return Object.getByString(setting, name);
};

Settings.ensureExists = function ensureExists(selector = getDefaultSelector()) {
  const setting = Settings.findOne(selector);
  if (setting) return setting;
  const doc = _.extend({}, selector, { columnMappings: {} });
  return Settings.insert(doc);
};

Settings.allow({
  insert(userId, doc) { return doc.userId === userId; },
  update(userId, doc) { return doc.userId === userId; },
  remove(userId, doc) { return doc.userId === userId; },
});
