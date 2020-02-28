import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Fraction } from 'fractional';
import { flatten } from 'flat';
import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '../api/partners/partners';

function flattenBankAccountNumber(BAN) {
  return BAN.trim().split('-').join();
}

export const Import = {
  findAccountByNumber(BAN) {
    return { account: '`382' };
    const flattenedBAN = flattenBankAccountNumber(BAN);
    const community = getActiveCommunity();
    const bankAccounts = community.bankAccounts;
    return bankAccounts.find(ba => flattenBankAccountNumber(ba.accountNumber) === flattenedBAN);
  },
  findPartner(partnerText) {
    return partnerText;
  },
};

// TODO: get this out from TAPI
const schemaParcels = {
  "label": "Albetét",
  "category": {
    "label": "Kategória",
    "@property": "Albetét",
    "@common": "Közös tulajdon",
    "@group": "Gyűjtő",
    "#tag": "Elszámolási egység"
  },
  "serial": {
    "label": "Sorszám",
    "placeholder": "(pl. 34)",
    "help": "Egyedi sorszám, mely segít sorba rendezni a helyeinket. A helyrajzi szám utolsó száma például kíválóan alkalmas erre."
  },
  "code": {
    "label": "Könyvelési kód",
    "placeholder": "(pl. @B a B épülethez)",
    "help": "A könyvelési kód tetszőleges karakter sorozat lehet. Amikor azonos karakterekkel kezdődik egy másik kód, akkor az az al-kódja a másik helynek, ezzel lehet hierarchiába rendezni a helyeinket. Érdemes konvenciót használni, mint pl @ jelöli a fizikai helyeket, és ezt követheti az épület, az emelet majd az ajtó kódja. Ha nem ad meg kódot, akkor a 'Megjejölést' fogja használni a rendszer könyvelési kódnak."
  },
  "ref": {
    "label": "Elnevezés",
    "placeholder": "(pl. B405)",
    "help": "Egyedi azonosító, mellyel hivatkozni lehet erre a helyre"
  },
  "leadRef": {
    "label": "Vezető albetét",
    "placeholder": "(pl. K108)"
  },
  "units": {
    "label": "Tulajdoni hányad",
    "placeholder": "(pl. 135)"
  },
  "building": {
    "label": "Épület",
    "placeholder": "(pl. K)"
  },
  "floor": {
    "label": "Emelet",
    "placeholder": "(pl. 4 vagy IV)"
  },
  "door": {
    "label": "Ajtó",
    "placeholder": "(pl. 24)"
  },
  "type": {
    "label": "Típus",
    "placeholder": "(pl. Lakás)",
    "flat": "Lakás",
    "parking": "Parkoló",
    "storage": "Tároló",
    "cellar": "Pince",
    "attic": "Padlás",
    "shop": "Üzlet",
    "office": "Iroda",
    "other": "Egyéb"
  },
  "group": {
    "label": "Csoport",
    "help": "Tetszőleges szó, ami azonosítja melyik csoportba tartozik ez az albetét. Az előrásoknál lehet a csoport szerint szűrni.",
    "placeholder": "(pl. Vízórás)"
  },
  "lot": {
    "label": "Helyrajzi szám",
    "placeholder": "(pl. 293456/A/24)"
  },
  "location": {
    "label": "Elhelyezkedés"
  },
  "area": {
    "label": "Alapterület (m2)",
    "placeholder": "(pl. 45)"
  },
  "volume": {
    "label": "Légköbméter (m3)",
    "placeholder": "(pl. 142)"
  },
  "habitants": {
    "label": "Lakók száma",
    "placeholder": "(pl. 3)"
  },
  "freeFields": {
    "label": "Kötetlen mezők",
    "$": {
      "key": {
        "label": "Megnevezés",
        "placeholder": "(pl. Belmagasság)"
      },
      "value": {
        "label": "Érték",
        "placeholder": "(pl. 3,5m)"
      }
    }
  }
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
  constructor(collection, lang) {
    this.collection = collection;
    this.lang = lang;
    this.dictionary = (collection._name === 'parcels' && lang === 'hu') ? schemaParcels : {};
  }
  reverse(jsons) {
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
    const sameString = (str1, str2) => (str1.localeCompare(str2, this.lang, { sensitivity: 'base' }) === 0);
    return jsons.map(json => {
      const tjson = {};
      _.each(json, (fieldValue, fieldName) => {
        const enFieldName = _.findKey(this.dictionary, k => sameString(fieldName, this.dictionary[k].label));
        const enFieldValue = _.findKey(this.dictionary[enFieldName], k => sameString(fieldValue, this.dictionary[enFieldName][k]));
        tjson[enFieldName || fieldName] = enFieldValue || fieldValue;
      });
      return tjson;
    });
  }
}

// Problem of dealing with dates as js Date objects:
// https://stackoverflow.com/questions/2698725/comparing-date-part-only-without-comparing-time-in-javascript
// https://stackoverflow.com/questions/15130735/how-can-i-remove-time-from-date-with-moment-js

export const Transformers = {
  parcels: {
    default: (jsons, options) => {
      jsons.forEach((json) => {
        json.category = json.category || '@property';
      });
      return jsons;
    },
  },
  parcelships: {
    default: (jsons, options) => {
      const tjsons = [];
      const communityId = getActiveCommunityId();
      jsons.forEach((doc) => {
        if (doc.leadRef && doc.leadRef !== doc.ref) {
          const parcel = Parcels.findOne({ communityId, ref: doc.ref });
          productionAssert(parcel, `No parcel with this ref ${doc.ref}`);
          const leadParcel = Parcels.findOne({ communityId, ref: doc.leadRef });
          productionAssert(leadParcel, `No parcel with this ref ${doc.leadRef}`);
          const tdoc = {}; $.extend(true, tdoc, doc);
          tdoc.parcelId = parcel._id;
          tdoc.leadParcelId = leadParcel._id;
          tjsons.push(tdoc);
        }
      });
      return tjsons;
    },
  },
  partners: {
    default: (jsons, options) => {
      const tjsons = [];
      const communityId = getActiveCommunityId();
      debugAssert(communityId);
      jsons.forEach((doc) => {
        const partner = Partners.findOne({ 'idCard.name': doc['idCard.name'] });
        if (!partner) {
          doc.idCard = doc.idCard || {};
          doc.idCard.type = doc['idCard.type'] || 'natural';
          doc.relation = doc.relation || 'member';
          tjsons.push(doc);
        }
      });
      return tjsons;
    },
  },
  memberships: {
    default: (jsons, options) => {
      const tjsons = [];
      const communityId = getActiveCommunityId();
      debugAssert(communityId);
      jsons.forEach((doc) => {
        const parcel = Parcels.findOne({ communityId, ref: doc.ref.trim() });
        doc.parcelId = parcel._id;
        doc.role = doc.role || 'owner';
        const names = doc.owners ? doc.owners.split(/,|;|\n/) : [];
        const emails = doc.emails ? doc.emails.split(/,|;| |\n/) : [];
        names.forEach((name) => {
          const partner = Partners.findOne({ 'idCard.name': name });
          productionAssert(partner, `No partner with this name ${name}`);
          const tdoc = {}; $.extend(true, tdoc, doc);
          tdoc.partnerId = partner._id;
          tdoc.ownership = { share: new Fraction(1, names.length) };
          tjsons.push(tdoc);
        });
      });
      return tjsons;
    },
  },
  transactions: {
    // Before upload: convert two money columns to number
    default: (jsons, options) => {
      const tjsons = [];
      jsons.forEach((doc, i) => {
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
            account: '`46',
          }],
        };
        tjsons.push(bill);
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
              account: '`46',
            }],
            // credit is one of the '`38' accounts
          };
          tjsons.push(payment);
    //      }
        }
      });
      return tjsons;
    },
  },

  // Before upload: convert all money columns to number
  balances: {
    default: (jsons, options) => {
      const tjsons = [];
      jsons.forEach((doc) => {
        const date = moment.utc(doc["Dátum"]);
        const tag = `C-${date.year()}-${date.month() + 1}`;
        const number = key => (Number(doc[key]) || 0);
    //  '`381' name: 'Pénztár' },
    //  '`382', name: 'Folyószámla' },
    //  '`383', name: 'Megtakarítási számla' },
    //  '`384', name: 'Fundamenta' },
        tjsons.push({
          account: '`381',
          tag,
          debit: number("Pénztár"),
        });
        tjsons.push({
          account: '`382',
          tag,
          debit: number("K&H üzemeltetési számla"),
        });
        tjsons.push({
          account: '`383',
          tag,
          debit: number("K&H felújítási számla") + number("K&H megtakarítási számla"),
        });
        const fundamentaAccountNames = Object.keys(doc).filter(key => key.startsWith('Fundamenta'));
        let fundamentaBalance = 0;
        fundamentaAccountNames.forEach(key => fundamentaBalance += number(key));
        tjsons.push({
          account: '`384',
          tag,
          debit: fundamentaBalance,
        });
      });
      return tjsons;
    },
  },

  statementEntries: {
    default: (jsons, options) => {
      const tjsons = [];
      jsons.forEach((json) => {
        const tjson = {
          ref: json['Tranzakció azonosító '],
          refType: json['Típus'],
          account: Import.findAccountByNumber(json['Könyvelési számla']).account,
          valueDate: json['Könyvelés dátuma'],
          amount: json['Összeg'],
          name: Import.findPartner(json['Partner elnevezése']),
          note: json['Közlemény'],
          statementId: options.source,
  //        txId
        };
        if (options.keepOriginals) tjson.original = json;
        tjsons.push(tjson);
      });
      return tjsons;
    },
  },
};
