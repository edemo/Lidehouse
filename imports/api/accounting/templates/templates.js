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
  else templateId = Communities.direct.insert({ //.upsert({ name: doc.name, isTemplate: true }, // using upsert, because with insert the 'null' vallue is not possible to into mongo (gets cleaned)
//    { $set: {
      name: doc.name,
      isTemplate: true,
      zip: '0000', city: 'x', street: 'x', number: '0', lot: '0/0',
      settings: {
        language: 'hu',
        ownershipScheme: 'condominium',
        accountingMethod: 'accrual',
        templateId: 'xQhxdpneEbvT9RuMr',  // TODO, this is just here because  field is mandatory, and insert operation does not accept null value (cleans it off), and upsert operation does accept null, but does not do the defaultValues operation, so we would need to set a dozen other irrelevant settings fields for the template
//      },
    },
  });

  ['accounts', 'parcels', 'txdefs', 'sharedfolders', 'buckets'].forEach(collectionName => {
    const collection = Mongo.Collection.get(collectionName);
    doc[collectionName]?.forEach(elem => collection.insertTemplateDoc(templateId, elem));
  });
};
