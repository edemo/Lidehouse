import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { debugAssert } from '/imports/utils/assert.js';
import { noUpdate } from '/imports/utils/autoform.js';

export function SerialId(definerFields = []) {
  const schema = new SimpleSchema({
    serial: { type: Number, decimal: true, defaultValue: 0, autoform: { omit: true, ...noUpdate } },
    serialId: { type: String, optional: true, autoform: { omit: true, ...noUpdate } },
  });

  // indexing needed for quickly determining last id
  const indexDefinition = { communityId: 1 };
  definerFields.forEach((field) => {
    indexDefinition[field] = 1;
  });
  indexDefinition.serial = -1;
  const indexes = function indexSerialId(collection) {
    if (Meteor.isServer) {
      collection._ensureIndex(indexDefinition);
    }
  };

  const helpers = {
    computeSerialId() {
      if (Meteor.isClient) return 'not-available';
      let preKey = '';
      const language = this.community().settings.language;
      definerFields.forEach((field) => {
        const fieldValue = Object.getByString(this, field);
        if (fieldValue) {
          const preKeyFragment = fieldValue.substr(0, 3).toUpperCase();
          preKey += TAPi18n.__(preKeyFragment, {}, language) + '/';
        }
      });
      debugAssert(this.serial); // not exist yet when inserting
      return `${preKey}${this.serial}/${this.createdAt.getFullYear()}`;
    },
  };

  function hooks(collection) {
    return {
      before: {
        insert(userId, doc) {
          if (!doc.serialId) { // keep it, if already exists
            const selector = { communityId: doc.communityId };
            definerFields.forEach((field) => {
              selector[field] = Object.getByString(doc, field) || { $exists: false };
            });
            const last = collection.findOne(selector, { sort: { serial: -1 } });
            const nextSerial = last ? last.serial + 1 : 1;
            doc.serial = nextSerial;
            const tdoc = this.transform();
            doc.serialId = tdoc.computeSerialId();
          }
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

