import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

export const SerialId = function (collection, definerFields = []) {
  // indexing needed for quickly determining last id
  Meteor.startup(function indexCollection() {
    const indexDefinition = { communityId: 1 };
    definerFields.forEach((field) => {
      indexDefinition[field] = 1;
    });
    indexDefinition.serial = -1;
    collection.ensureIndex(indexDefinition);
  });

  const schema = new SimpleSchema({
    serial: { type: Number, optional: true },
  });

  const helpers = {
    serialId() {
      let preKey = '';
      definerFields.forEach((field) => {
        preKey += this[field].charAt(0).toUpperCase() + '/';
      });
      debugAssert(this.serial);
      return `${preKey}${this.serial}/${this.createdAt.getFullYear()}`;
    },
  };

  const hooks = {
    before: {
      insert(userId, doc) {
        const selector = { communityId: doc.communityId };
        definerFields.forEach((field) => {
          selector[field] = Object.byString(doc, field);
        });
        const last = collection.findOne(selector, { sort: { serial: -1 } });
        const nextSerial = last ? last.serial + 1 : 1;
        doc.serial = nextSerial;
        return true;
      },
    },
  };

  return { schema, helpers, methods: {}, hooks };
};

/*
export function readableId(collection, doc) {
  const year = new Date().getFullYear();
  const preKey = doc.category ? doc.category.charAt(0).toUpperCase() : 'D';
  const max = collection.findOne({ 'readableId.year': year, 'readableId.preKey': preKey, communityId: doc.communityId }, { sort: { 'readableId.number': -1 } });
  const number = max ? max.readableId.number + 1 : 1;
  doc.readableId = { preKey, number, year };
}*/

