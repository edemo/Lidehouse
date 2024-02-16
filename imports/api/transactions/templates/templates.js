import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';

export const Templates = {};

Templates.define = function define(doc) {
  Templates[doc.name] = doc;
  if (doc.included) return;
  let templateId;
  const Communities = Mongo.Collection.get('communities');
  const template = Communities.findOne({ name: doc.name, isTemplate: true });
  if (template) templateId = template._id;
  else templateId = Communities.direct.insert({
    name: doc.name,
    isTemplate: true,
    zip: '0000', city: 'x', street: 'x', number: '0', lot: '0/0',
    settings: {
      language: 'hu',
      ownershipScheme: 'condominium',
      accountingMethod: 'accrual',
    },
  });

  ['accounts', 'parcels', 'txdefs', 'sharedfolders'].forEach(collectionName => {
    const collection = Mongo.Collection.get(collectionName);
    doc[collectionName]?.forEach(elem => collection.insertTemplateDoc(templateId, elem));
  });
};
