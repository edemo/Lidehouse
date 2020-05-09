import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';

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


export function getCollectionsToImport(collection) {
  if (collection._name === 'parcels') {
    return [{
      collection: Parcels,
      schema: Parcels.simpleSchema({ category: '@property' }),
    }, {
      collection: Parcelships,
      schema: Parcelships.simpleSchema(),
    }, {
      collection: Partners,
      schema: Partners.simpleSchema(),
    }, {
      collection: Memberships,
      schema: Memberships.simpleSchema({ role: 'owner' }),
      omitFields: ['partnerId', 'ownership.representor'],
    }];
  }
  return [{ collection, schema: collection.simpleSchema() }];
}

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
  constructor(collection, lang) {
    this.collection = collection;
    this.lang = lang;
    if (lang === 'hu') {
      if (collection._name === 'parcels') this.dictionary = TAPi18n.__('schemaParcels', { returnObjectTrees: true }, 'hu');
      else if (collection._name === 'parcelships') this.dictionary = TAPi18n.__('schemaParcelships', { returnObjectTrees: true }, 'hu');
      else if (collection._name === 'partners') this.dictionary = TAPi18n.__('schemaPartners', { returnObjectTrees: true }, 'hu');
      else if (collection._name === 'memberships') this.dictionary = TAPi18n.__('schemaMemberships', { returnObjectTrees: true }, 'hu');
      else this.dictionary = {};
    }
  }
  __(key) {
    const split = key.split('.');
    const transSplit = split.map((k, i) => {
      const path = split.slice(0, i + 1).join('.');
      const trans = TAPi18n.__(`schema${this.collection._name.capitalize()}.${path}.label`, {}, this.lang);
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
          if (typeof fieldValue === 'object') {
            path.push(enFieldName);
            reverseObject(fieldValue);
            path.pop();
          } else {
            let enFieldValue;
            if (typeof fieldValue === 'string') {
              const trimFieldValue = fieldValue.trim();
              enFieldValue =
                (dictionary && _.findKey(dictionary[enFieldName], k => sameString(trimFieldValue, dictionary[enFieldName][k])))
                || trimFieldValue;
            }
            Object.setByString(tdoc, path.concat([enFieldName]).join('.'), enFieldValue || fieldValue);
          }
        });
      }
      reverseObject(doc);
      return tdoc;
    });
  }
}

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export const Transformers = {
  parcels: {
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc) => {
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdoc.category = tdoc.category || '@property';
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
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
  partners: {
    default: (docs, options) => {
      const tdocs = [];
      const communityId = getActiveCommunityId();
      debugAssert(communityId);
      docs.forEach((doc) => {
        if (!doc.idCard || !doc.idCard.name) return;
        const tdoc = {}; $.extend(true, tdoc, doc);
        tdoc.idCard.type = tdoc.idCard.type || 'natural';
        tdoc.relation = tdoc.relation || ['member'];
        tdocs.push(tdoc);
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
        if (!tdoc.role) tdoc.role = 'owner';
        if (!tdoc.ownership) tdoc.ownership = { share: new Fraction(1) };
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
  transactions: {
    // Before upload: convert two money columns to number
    default: (docs, options) => {
      const tdocs = [];
      docs.forEach((doc, i) => {
        const docRef = '' + (i+2) + '-' + doc['Számla kelte'] + '@' + doc['Szállító neve adóigazgatási azonosító száma'] + '#' + doc['Számla száma, vevőkód, fogy hely az'];
    //    const cutoffDate = moment(moment.utc('2019-06-01'));
        const incomingDate = moment(moment.utc(doc['A számla fizetési határideje'] || doc['Számla kelte']));
        if (!incomingDate.isValid()) console.error('ERROR: Invalid date in import', doc);
    //    if (incomingDate < cutoffDate) {
        const bill = {
          ref: '>' + docRef,
          partner: doc['Szállító neve adóigazgatási azonosító száma'],
          valueDate: incomingDate.toDate(),
          amount: parseInt(doc['Számla összege'], 10),
          // debit is one of the '8' accounts
          credit: [{
            account: '`454',
          }],
        };
        tdocs.push(bill);
    //    }
        if (doc['A számla kiegyenlítésének időpontja']) {
          const paymentDate = moment(moment.utc(doc['A számla kiegyenlítésének időpontja']));
          if (!paymentDate.isValid()) console.error('ERROR: Invalid date in import', doc);
    //      if (paymentDate < cutoffDate) {
          const payment = {
            ref: '<' + docRef,
            partner: doc['Szállító neve adóigazgatási azonosító száma'],
            valueDate: paymentDate.toDate(),
            amount: parseInt(doc['Számla összege'], 10),
    //          amount: parseInt(doc['A számla kiegyenlítésének összege'], 10),
            debit: [{
              account: '`454',
            }],
            // credit is one of the '`38' accounts
          };
          tdocs.push(payment);
    //      }
        }
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

  statementEntries: {
    default: (docs, options) => {
      const account = Accounts.findOne({ communityId: options.communityId, code: options.account });
      const tdocs = [];
      docs.forEach((doc) => {
        let tdoc;
        switch (account.bank) {
          case 'K&H': {
//            productionAssert(options.account.code === Import.findAccountByNumber(doc['Könyvelési számla']).code, 'Bank account mismatch on bank statement');
            tdoc = {
              ref: doc['Tranzakció azonosító'],
              refType: doc['Típus'],
              valueDate: moment.utc(doc['Könyvelés dátuma']).toDate(),
              amount: doc['Összeg'],
              name: doc['Partner elnevezése'],
              note: doc['Közlemény'],
            };
            break;
          }
          case undefined: {
            productionAssert(account.category === 'cash');
            const amount = doc['Bevétel'] || (doc['Kiadás'] * -1);
            tdoc = {
              ref: doc['Sorszám'],
              refType: (doc['Bevétel'] && 'Bevétel') || (doc['Kiadás'] && 'Kiadás'),
              valueDate: moment.utc(doc['Dátum']).toDate(),
              amount,
              name: doc['Név'],
              note: doc['Bizonylatszám (1)'],
            };
            break;
          }
          default: productionAssert(false, `No protocol for bank ${account.bank}`);
        }
        tdoc.account = options.account;
        tdoc.statementId = options.source;
        if (options.keepOriginals) tdoc.original = doc;
        tdocs.push(tdoc);
      });
      return tdocs;
    },
  },
};
