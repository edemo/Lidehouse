import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';

let getDefaultSelector;
if (Meteor.isClient) {
  getDefaultSelector = () => ({ userId: Meteor.userId() });
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
  const extendedSelector = _.extend({ communityId: { $exists: false } }, selector);
  const setting = Settings.findOne(extendedSelector);
  if (!setting) return undefined;
  return Object.getByString(setting, name);
};

Settings.set = function set(name, value, selector = getDefaultSelector()) {
  const extendedSelector = _.extend({ communityId: { $exists: false } }, selector);
  const setting = Settings.findOne(extendedSelector);
  const settingId = setting ? setting._id : Settings.insert(selector);
  Settings.update(settingId, { $set: { [name]: value } });
};

Settings.allow({
  insert(userId, doc) { return doc.userId === userId; },
  update(userId, doc) { return doc.userId === userId; },
  remove(userId, doc) { return doc.userId === userId; },
});
