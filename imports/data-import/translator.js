import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { callOrRead } from '/imports/api/utils.js';

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
    if (collection._name === 'balances') schemaTranslation = [];
    else if (collection._name === 'transactions') {
      schemaTranslation = [
        TAPi18n.__(`schema${this.collection._name.capitalize()}`, { returnObjectTrees: true }, 'hu'),
        TAPi18n.__(`schema${this.options.entity.capitalize()}s`, { returnObjectTrees: true }, 'hu'),
        TAPi18n.__('schemaNoted', { returnObjectTrees: true }, 'hu'),
      ];
    } else {
      schemaTranslation = [TAPi18n.__(`schema${this.collection._name.capitalize()}`, { returnObjectTrees: true }, 'hu')];
    }
    this.dictionary = _.deepExtend({}, ...schemaTranslation, dictionary);
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
    const allowedValues = callOrRead.call(schema, schema.allowedValues);
    if (allowedValues) {
      let result = '(';
      allowedValues.forEach((val, i) => {
        result += Object.getByString(this.dictionary, key)?.options?.[val];
        if (i < allowedValues.length - 1) result += '/';
      });
      result += ')';
      return result;
    }
    return '';
  }

  reverse(docs) {
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
            if (typeof fieldValue === 'undefined') return undefined;
            if (typeof fieldValue !== 'string') return fieldValue;
            const trimFieldValue = fieldValue.trim();
            return _.findKey(dictionary?.[enFieldName]?.options, k => sameString(trimFieldValue, dictionary[enFieldName].options[k]))
              || trimFieldValue;
          }
          if (_.isSimpleObject(fieldValue)) {
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
      const original = Object.deepCloneOwn(doc);
      reverseObject(doc);
      if (this.options.keepOriginals) tdoc.original = original;
      return tdoc;
    });
  }

  applyDefaults(docs) {
    const self = this;
    return docs.forEach((doc, index) => {
      const path = [];
      const conductor = this.conductor; // so it can be used in eval's context
      function applyDefault(dic) {
        const joinedPath = path.join('.');
        if (Object.getByString(doc, joinedPath)) return;
        if (dic.formula) {
          dic.depends?.forEach(name => {
            if (_.isUndefined(doc[name])) throw new Meteor.Error('err_invalidData', 'Depended field is missing', name);
          });
          const calculatedValue = eval(dic.formula);
          Object.setByString(doc, joinedPath, calculatedValue);
        }
        if (dic.default) {
          Object.setByString(doc, joinedPath, dic.default);
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
