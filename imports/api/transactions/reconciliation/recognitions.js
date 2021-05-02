import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { debugAssert } from '/imports/utils/assert.js';
import { replaceDotsInString } from '/imports/api/utils';

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
});

Recognitions.attachSchema(Recognitions.schema);

Recognitions.simpleSchema().i18n('schemaRecognitions');


Meteor.startup(function indexSettings() {
  if (Meteor.isServer) {
    Recognitions._ensureIndex({ communityId: 1 });
  }
});

Recognitions.getName = function getName(name, selector = getDefaultSelector()) {
  const setting = Recognitions.findOne(selector);
  if (!setting) return undefined;
  const compatibleName = replaceDotsInString(name);
  return Object.getByString(setting, `names.${compatibleName}`);
};

Recognitions.setName = function set(name, value, selector = getDefaultSelector()) {
  const setting = Recognitions.findOne(selector);
  const settingId = setting ? setting._id : Recognitions.insert(selector);
  const compatibleName = replaceDotsInString(name);
  Recognitions.update(settingId, { $set: { [`names.${compatibleName}`]: value } });
};

Recognitions.allow({
  insert(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statements.reconcile', doc); },
  update(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statements.reconcile', doc); },
  remove(userId, doc) { return Meteor.users.findOne(userId)?.hasPermission('statements.reconcile', doc); },
});
