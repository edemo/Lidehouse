import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
//import { Timestamped } from '/imports/api/behaviours/timestamped.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

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

function importParcel(communityId, parcel) {
  const imported = _.extend({ communityId }, parcel);
  imported.ref = imported.name; delete imported.name;
  const collection = Mongo.Collection.get('parcels');
  collection.insert(imported);
}

function importTxdef(communityId, txdef) {
  const imported = _.extend({ communityId }, txdef);
  const collection = Mongo.Collection.get('txdefs');
  collection.insert(imported);
}

Templates.clone = function clone(id, communityId) {
  const template = Templates.findOne(id);
  if (!template) {
    Log.info('Templates:', Templates.find({}).fetch());
    throw new Meteor.Error('err_notExists', 'No such object', { template: id });
  }
  if (template.accounts) {
    template.accounts.forEach(doc => importAccount(communityId, doc));
  }
  if (template.parcels) {
    template.parcels.forEach(doc => importParcel(communityId, doc));
  }
  if (template.txdefs) {
    template.txdefs.forEach(doc => importTxdef(communityId, doc));
  }
  return true;
};

/*
Templates.helpers({
});

Templates.attachSchema(Templates.schema);

Templates.simpleSchema().i18n('schemaTemplates');

Factory.define('template', Templates, {
});
*/
