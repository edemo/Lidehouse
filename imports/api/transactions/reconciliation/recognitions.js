import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { debugAssert } from '/imports/utils/assert.js';

let getDefaultSelector;
if (Meteor.isClient) {
  import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
  getDefaultSelector = () => ({ communityId: getActiveCommunityId() });
} else {
  getDefaultSelector = () => debugAssert(false, 'On the server side, you need to supply a recognitions selector');
}

export const Recognitions = new Mongo.Collection('recognitions');

Meteor.startup(function indexSettings() {
  if (Meteor.isServer) {
    Recognitions._ensureIndex({ communityId: 1 });
  }
});

Recognitions.get = function get(name, selector = getDefaultSelector()) {
  const setting = Recognitions.findOne(selector);
  if (!setting) return undefined;
  return Object.getByString(setting, name);
};

Recognitions.set = function set(name, value, selector = getDefaultSelector()) {
  const setting = Recognitions.findOne(selector);
  const settingId = setting ? setting._id : Recognitions.insert(selector);
  Recognitions.update(settingId, { $set: { [name]: value } });
};

Recognitions.allow({
  insert(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statementEntries.reconcile', doc); },
  update(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statementEntries.reconcile', doc); },
  remove(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statementEntries.reconcile', doc); },
});
