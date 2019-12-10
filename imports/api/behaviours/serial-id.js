import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { debugAssert } from '/imports/utils/assert.js';
import { noUpdate } from '/imports/utils/autoform.js';

export function SerialId(definerFields = []) {
  const schema = new SimpleSchema({
    serial: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true, ...noUpdate } },
  });

  // indexing needed for quickly determining last id
  const indexDefinition = { communityId: 1 };
  definerFields.forEach((field) => {
    indexDefinition[field] = 1;
  });
  indexDefinition.serial = -1;
  const indexes = [indexDefinition];

  const helpers = {
    serialId() {
      let preKey = '';
      definerFields.forEach((field) => {
        preKey += __(Object.getByString(this, field).substr(0, 3).toUpperCase()) + '/';
      });
      debugAssert(this.serial);
      return `${preKey}${this.serial}/${this.createdAt.getFullYear()}`;
    },
  };

  function hooks(collection) {
    return {
      before: {
        insert(userId, doc) {
          const selector = { communityId: doc.communityId };
          definerFields.forEach((field) => {
            selector[field] = Object.getByString(doc, field) || { $exists: false };
          });
          const last = collection.findOne(selector, { sort: { serial: -1 } });
          const nextSerial = last ? last.serial + 1 : 1;
          doc.serial = nextSerial;
          return true;
        },
      },
    };
  }

  return { name: 'SerialId',
    schema, indexes, helpers, methods: {}, hooks,
  };
}

/*
export function readableId(collection, doc) {
  const year = new Date().getFullYear();
  const preKey = doc.category ? doc.category.charAt(0).toUpperCase() : 'D';
  const max = collection.findOne({ 'readableId.year': year, 'readableId.preKey': preKey, communityId: doc.communityId }, { sort: { 'readableId.number': -1 } });
  const number = max ? max.readableId.number + 1 : 1;
  doc.readableId = { preKey, number, year };
}*/

