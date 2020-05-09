import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';
import deepExtend from 'deep-extend';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

function flattenBankAccountNumber(BAN) {
  return BAN.trim().split('-').join();
}

export const Import = {
  findAccountByNumber(BAN) {
    return Accounts.findOne({ BAN });
  },
  findPartner(partnerText) {
    return partnerText;
  },
};

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
}

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
    console.log('dict', this.dictionary);
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
          const calculatedValue = eval(dic.formula)
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
  }}

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export class Parser {
  constructor(schema) {
    this.schema = schema;
  }
  parse(doc) {
    _.each(this.schema._schema, (schemaValue, key) => {
      const textValue = Object.getByString(doc, key);
      if (!textValue) return;
      switch (schemaValue.type.name) {
        case 'Date': {
          const date = moment.utc(textValue);
          if (!date.isValid()) throw new Meteor.error('err_invalidData', `Invalid date in import: ${textValue}`);
          Object.setByString(doc, key, date.toDate());
          break;
        }
        case 'Fraction': {
          const fraction = new Fraction(textValue);
          if (!fraction) throw new Meteor.error('err_invalidData', `Invalid fraction in import: ${textValue}`);
          Object.setByString(doc, key, fraction);
          break;
        }
        case 'Number': {
          const number = schemaValue.decimal ? parseFloat(textValue) : parseInt(textValue, 10);
          if (number === NaN) throw new Meteor.error('err_invalidData', `Invalid number in import: ${textValue}`);
          Object.setByString(doc, key, number);
          break;
        }
        case 'Boolean': {
          const boolean = new Boolean(textValue);
          Object.setByString(doc, key, boolean);
          break;
        }
        case 'String':
        case 'Object':
        case 'Array': break;
        default: productionAssert(false, `Not able to parse ${schemaValue.type.name}`);
      }
    });
  }
}

// Multiple collections can be imported with one import command

export function getCollectionsToImport(collection, options) {
  switch (collection._name) {
    case 'parcels': {
      return [{
        collection: Parcels,
        schema: Parcels.simpleSchema({ category: '@property' }),
        translator: new Translator(Parcels, options, 'hu', {
          category: { default: '@property' },
        }),
      }, {
        collection: Parcelships,
        schema: Parcelships.simpleSchema(),
        translator: new Translator(Parcelships, options, 'hu'),
      }, {
        collection: Partners,
        schema: Partners.simpleSchema(),
        translator: new Translator(Partners, options, 'hu', {
          relation: { default: ['member'] },
          idCard: { type: { default: 'natural' } },
        }),
      }, {
        collection: Memberships,
        schema: Memberships.simpleSchema({ role: 'owner' }),
        omitFields: ['partnerId', 'ownership.representor'],
        translator: new Translator(Memberships, options, 'hu', {
          role: { default: 'owner' },
          ownership: { default: { share: '1/1' } },
        }),
      }];
    }
    case 'transactions': {
      return [{
        collection: Transactions,
        schema: Parcels.simpleSchema({ category: 'bill' }),
        translator: new Translator(Transactions, options, 'hu', {
          category: { default: 'bill' },
          ref: { formula: "'SZ/SZALL/IMP/' + index" },
          partner: { label: 'Szállító neve adóigazgatási azonosító száma' },
          valueDate: { label: /* 'A számla fizetési határideje' || */'Számla kelte' },
          amount: { label: 'Számla összege' },
          // debit is one of the '8' accounts
          credit: { default: [{ account: '`454' }] },
        }),
      }, {
        collection: Transactions,
        schema: Parcels.simpleSchema({ category: 'payment' }),
        translator: new Translator(Transactions, options, 'hu', {
          category: { default: 'payment' },
          ref: { formula: "'FIZ/SZALL/IMP/' + index" },
          partner: { label: 'Szállító neve adóigazgatási azonosító száma' },
          valueDate: { label: 'A számla kiegyenlítésének időpontja' },
          amount: { label: 'Számla összege' },
  //          amount: { label: 'A számla kiegyenlítésének összege' },
          debit: { default: [{ account: '`454' }] },
        }),
      }];
    }
    case 'statementEntries': {
      const account = Accounts.findOne({ communityId: options.communityId, code: options.account });
      const dictionary = {
        account: { default: options.account },
        statementId: { default: options.source },
      };
      switch (account.bank) {
        case 'K&H': {
//            productionAssert(options.account.code === Import.findAccountByNumber(doc['Könyvelési számla']).code, 'Bank account mismatch on bank statement');
          _.extend(dictionary, {
            ref: { label: 'Tranzakció azonosító' },
            refType: { label: 'Típus' },
            valueDate: { label: 'Könyvelés dátuma' },
            amount: { label: 'Összeg' },
            name: { label: 'Partner elnevezése' },
            note: { label: 'Közlemény' },
          });
          break;
        }
        case undefined: {
          productionAssert(account.category === 'cash');
          _.extend(dictionary, {
            ref: { label: 'Sorszám' },
            refType: { depends: ['Bevétel', 'Kiadás'], formula: "(doc['Bevétel'] && 'Bevétel') || (doc['Kiadás'] && 'Kiadás')" },
            valueDate: { label: 'Dátum' },
            amount: { depends: ['Bevétel', 'Kiadás'], formula: "doc['Bevétel'] || (doc['Kiadás'] * -1)" },
            name: { label: 'Név' },
            note: { label: 'Bizonylatszám (1)' },
          });
          break;
        }
        default: productionAssert(false, `No protocol for bank ${account.bank}`);
      }
      return [{
        collection,
        schema: collection.simpleSchema(),
        translator: new Translator(collection, options, 'hu', dictionary),
      }];
    }
    default: return [{
      collection,
      schema: collection.simpleSchema(),
      translator: new Translator(collection, options, 'hu'),
    }];
  }
}

export const Transformers = {
  parcelships: {
    default: (docs, options) => {
      const tdocs = [];
      const communityId = getActiveCommunityId();
      docs.forEach((doc) => {
        if (doc.leadRef && doc.leadRef !== doc.ref) {
          const parcel = Parcels.findOne({ communityId, ref: doc.ref });
          productionAssert(parcel, `No parcel with this ref ${doc.ref}`);
          const leadParcel = Parcels.findOne({ communityId, ref: doc.leadRef });
          productionAssert(leadParcel, `No parcel with this ref ${doc.leadRef}`);
          const tdoc = {}; $.extend(true, tdoc, doc);
          tdoc.parcelId = parcel._id;
          tdoc.leadParcelId = leadParcel._id;
          tdocs.push(tdoc);
        }
      });
      return tdocs;
    },
  },
  memberships: {
    default: (docs, options) => {
      const tdocs = [];
      const communityId = getActiveCommunityId();
      debugAssert(communityId);
      docs.forEach((doc) => {
        if (!doc.idCard || !doc.idCard.name) return;
        const parcel = Parcels.findOne({ communityId, ref: doc.ref });
        productionAssert(parcel, `No parcel with this ref ${doc.ref}`);
        const partner = Partners.findOne({ communityId, 'idCard.name': doc.idCard.name });
        productionAssert(partner, `No partner with this name ${doc.idCard.name}`);
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdoc.parcelId = parcel._id;
        tdoc.partnerId = partner._id;
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
  // Before upload: convert all money columns to number
  balances: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        const date = moment.utc(doc["Dátum"]);
        const tag = `C-${date.year()}-${date.month() + 1}`;
        const number = key => (Number(doc[key]) || 0);
    //  '`381' name: 'Pénztár' },
    //  '`382', name: 'Folyószámla' },
    //  '`383', name: 'Megtakarítási számla' },
    //  '`384', name: 'Fundamenta' },
        tdocs.push({
          account: '`381',
          tag,
          debit: number("Pénztár"),
        });
        tdocs.push({
          account: '`382',
          tag,
          debit: number("K&H üzemeltetési számla"),
        });
        tdocs.push({
          account: '`383',
          tag,
          debit: number("K&H felújítási számla") + number("K&H megtakarítási számla"),
        });
        const fundamentaAccountNames = Object.keys(doc).filter(key => key.startsWith('Fundamenta'));
        let fundamentaBalance = 0;
        fundamentaAccountNames.forEach(key => fundamentaBalance += number(key));
        tdocs.push({
          account: '`384',
          tag,
          debit: fundamentaBalance,
        });
      });
      return tdocs;
    },
  },
};
