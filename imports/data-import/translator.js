import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';
import deepExtend from 'deep-extend';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';

// It is only available in undescore 1.8.1, and we are forced use 1.0.10
_.findKey = function findKey(obj, predicate) {
  let result;
  _.each(obj, (value, key) => {
    if (predicate(key)) {
      result = key;
      return false;
    }
  });
  return result;
};

export class Translator {
  constructor(collection, options, lang, dictionary) {
    this.collection = collection;
    this.options = options;
    this.lang = lang;
    debugAssert(lang === 'hu');
    let schemaTranslation;
    if (collection._name === 'parcels') schemaTranslation = TAPi18n.__('schemaParcels', { returnObjectTrees: true }, 'hu');
    else if (collection._name === 'parcelships') schemaTranslation = TAPi18n.__('schemaParcelships', { returnObjectTrees: true }, 'hu');
    else if (collection._name === 'partners') schemaTranslation = TAPi18n.__('schemaPartners', { returnObjectTrees: true }, 'hu');
    else if (collection._name === 'memberships') schemaTranslation = TAPi18n.__('schemaMemberships', { returnObjectTrees: true }, 'hu');
    else if (collection._name === 'statementEntries') schemaTranslation = TAPi18n.__('schemaStatementEntries', { returnObjectTrees: true }, 'hu');
    else schemaTranslation = {};
    this.dictionary = deepExtend({}, schemaTranslation, dictionary);
  }

  __(key) {
    const split = key.split('.');
    const transSplit = split.map((k, i) => {
      const path = split.slice(0, i + 1).join('.');
      const trans = Object.getByString(this.dictionary, `${path}.label`);
      return trans;
    });
    return transSplit.join('.');
  }

  example(key, schema) {
    if (schema.autoform && schema.autoform.placeholder) return schema.autoform.placeholder();
    if (schema.allowedValues) {
      let result = '(';
      schema.allowedValues.forEach((val, i) => {
        result += __(`schema${this.collection._name.capitalize()}.${key}.options.${val}`);
        if (i < schema.allowedValues.length - 1) result += '/';
      });
      result += ')';
      return result;
    }
    return '';
  }

  reverse(docs) {
/*    let categorySelector;
    if (this.collection._name === 'parcels') categorySelector = { category: '@property' };
    if (this.collection._name === 'memberships') categorySelector = { role: 'owner' };
    const schema = this.collection.simpleSchema(categorySelector);
    const tapi = TAPi18n;
    debugger;
    _.each(schema._schemaKeys, key => {
      this.dictionary[key] = `schema${this.collection._name.capitalize()}.${key}`;
    });
*/
    const self = this;
    const sameString = (str1, str2) => (str1.localeCompare(str2, this.lang, { sensitivity: 'base' }) === 0);
    return docs.map(doc => {
      const tdoc = {};
      const path = [];
      function reverseObject(obj) {
        _.each(obj, (fieldValue, fieldName) => {
          const trimFieldName = fieldName.trim();
          const dictionary = !path.length ? self.dictionary : Object.getByString(self.dictionary, path.join('.'));
          const enFieldName =
            (dictionary && _.findKey(dictionary, k => sameString(trimFieldName, dictionary[k].label)))
            || trimFieldName;
          function reverseValue(fieldValue) {
            const trimFieldValue = fieldValue.trim();
            return (dictionary && _.findKey(dictionary[enFieldName], k => sameString(trimFieldValue, dictionary[enFieldName][k])))
              || trimFieldValue;
          }
          if (typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
            path.push(enFieldName);
            reverseObject(fieldValue);
            path.pop();
          } else {
            let reversedValue;
            if (typeof fieldValue === 'string') {
              reversedValue = reverseValue(fieldValue);
            } else if (Array.isArray(fieldValue)) {
              reversedValue = fieldValue.map(v => reverseValue(v));
            } else reversedValue = fieldValue;
            Object.setByString(tdoc, path.concat([enFieldName]).join('.'), reversedValue);
          }
        });
      }
      const original = Object.deepClone(doc);
      reverseObject(doc);
      if (this.options.keepOriginals) tdoc.original = original;
      return tdoc;
    });
  }

  applyDefaults(docs) {
    const self = this;
    return docs.map((doc, index) => {
      const path = [];
      function applyDefault(dic) {
        if (dic.formula) {
          const calculatedValue = eval(dic.formula);
          Object.setByString(doc, path.join('.'), calculatedValue);
        }
        if (dic.default) {
          Object.setByString(doc, path.join('.'), dic.default);
        }
        if (typeof dic === 'object' && !Array.isArray(dic)) {
          _.each(dic, (value, key) => {
            if (typeof value === 'object') {
              path.push(key);
              applyDefault(value);
              path.pop();
            }
          });
        }
      }
      applyDefault(self.dictionary);
    });
  }
}
