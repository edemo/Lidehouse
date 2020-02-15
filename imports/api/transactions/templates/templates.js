import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
//import { Timestamped } from '/imports/api/behaviours/timestamped.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export const Templates = new Mongo.Collection('templates');

Templates.define = function define(doc) {
  Templates.upsert({ _id: doc._id }, { $set: doc });
};

function importAccount(communityId, account, includer) {
  const importedDoc = includer
    ? _.extend({ communityId }, account, { code: includer.code + account.code, category: includer.category })
    : _.extend({ communityId }, account);
  const collection = Mongo.Collection.get('accounts');
  collection.insert(importedDoc);
  if (account.include) {
    const includedTemplate = Templates.findOne(account.include);
    includedTemplate.accounts.forEach(a => importAccount(communityId, a, account));
  }
}

function importTxdef(communityId, txdef) {
  const imported = _.extend({ communityId }, txdef);
  const collection = Mongo.Collection.get('txdefs');
  collection.insert(imported);
}

Templates.clone = function clone(id, communityId) {
  const template = Templates.findOne(id);
  if (!template) return undefined;
  if (template.accounts) {
    template.accounts.forEach(acc => importAccount(communityId, acc));
  }
  if (template.txdefs) {
    template.txdefs.forEach(def => importTxdef(communityId, def));
  }
  return true;
};

/*
Templates.helpers({
});

Templates.attachSchema(Templates.schema);

Meteor.startup(function attach() {
  Templates.simpleSchema().i18n('schemaTemplates');
});

Factory.define('template', Templates, {
});
*/
