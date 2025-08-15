import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Log } from '/imports/utils/log.js';
import { debugAssert } from '/imports/utils/assert.js';
import { objectKeyCompatibleString } from '/imports/api/utils';

let getDefaultSelector;
if (Meteor.isClient) {
  import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
  getDefaultSelector = () => ({ communityId: getActiveCommunityId() });
} else {
  getDefaultSelector = () => debugAssert(false, 'On the server side, you need to supply a recognitions selector');
}

export const Recognitions = new Mongo.Collection('recognitions');

Recognitions.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  names: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  BANs: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 6 } },
});

Recognitions.attachSchema(Recognitions.schema);

Recognitions.simpleSchema().i18n('schemaRecognitions');


Meteor.startup(function indexRecognitions() {
  if (Meteor.isServer) {
    Recognitions._ensureIndex({ communityId: 1 });
  }
});

Recognitions.get = function get(what, name, selector = getDefaultSelector()) {
  Log.debug('Recognitions.get', what, name, selector);
  const setting = Recognitions.findOne(selector);
  if (!setting) return undefined;
  const compatibleName = objectKeyCompatibleString(name);
  return Object.getByString(setting, `${what}s.${compatibleName}`);
};

Recognitions.set = function set(what, name, value, selector = getDefaultSelector()) {
  Log.debug('Recognitions.set', what, name, value, selector);
  const setting = Recognitions.findOne(selector);
  const settingId = setting ? setting._id : Recognitions.insert(selector);
  const compatibleName = objectKeyCompatibleString(name);
  Recognitions.update(settingId, { $set: { [`${what}s.${compatibleName}`]: value } });
};

Recognitions.allow({
  insert(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statements.reconcile', doc); },
  update(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statements.reconcile', doc); },
  remove(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statements.reconcile', doc); },
});
