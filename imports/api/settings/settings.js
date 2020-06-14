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
  if (Meteor.isServer) {
    Settings._ensureIndex({ userId: 1, communityId: 1 });
  }
});

Settings.get = function get(name, selector = getDefaultSelector()) {
  const setting = Settings.findOne(selector);
  if (!setting) return undefined;
  return Object.getByString(setting, name);
};

Settings.set = function set(name, value, selector = getDefaultSelector()) {
  const setting = Settings.findOne(selector);
  const settingId = setting ? setting._id : Settings.insert(selector);
  Settings.update(settingId, { $set: { [name]: value } });
};

Settings.allow({
  insert(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('parcels.details', doc); },
  update(userId, doc) { return doc.userId === userId; },
  remove(userId, doc) { return doc.userId === userId; },
});
