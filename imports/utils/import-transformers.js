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
    "label": "Albetét",
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
  "occupants": {
    "label": "Birtokosok"
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
const schemaParcelships = {
  "leadParcelId": {
    "label": "Vezető albetét az"
  },
  "leadParcelRef": {
    "label": "Vezető albetét"
  },
  "parcelId": {
    "label": "Albetét"
  },
};
const schemaPartners = {
  "relation": {
    "label": "Partner viszony",
    "supplier": "Szállító",
    "customer": "Vevő",
    "member": "Tagság"      
  },
  "userId": {
    "label": "Kapcsolt felhasználó (ha már regisztrált)"
  },
  "idCard": {
    "label" : "Személyi adatok",
    "type": {
      "label": "Személy típusa",
      "natural": "magánszemély",
      "legal": "jogi személyiség"
    },
    "name": {
      "label": "Név",
      "placeholder": "(pl. Kovács János vagy Kulcslyuk Kft.)"
    },
    "address": {
      "label": "Bejelentett cím",
      "placeholder": "(pl. Bp 1065 Andrássy u 44.)"
    },
    "identifier": {
      "label": "Szig. szám ill. cégjegyzékszám",
      "placeholder": "(pl. 0985418NA vagy Cg.123456-89)"
    },
    "dob": {
      "label": "Születési ill. alapítási idő"
    },
    "mothersName": {
      "label": "Anyja leánykori neve",
      "placeholder": "(csak magánszemély esetén)"
    }
  },
  "contact": {
    "label" : "Kapcsolattartási adatok",
    "address": {
      "label": "Levelezési cím",
      "placeholder": "(pl. Bp 1065 Andrássy u 44.)"
    },
    "phone": {
      "label": "Telefonszám",
      "placeholder": "(pl. +36 30 123 4567)"
    },
    "email": {
      "label": "Email cím",
      "placeholder": "(pl. tibi45@dmail.com)"
    }
  },
  "BAN": { 
    "label": "Bankszámlaszám",
    "placeholder": "(pl 12345678-00000000-00000078)"
  },
  "taxNo": { 
    "label": "Adószám",
    "placeholder": "(pl 123456-2-42)",
    "help": "Nem szükséeges megadni, csak ha szeretné hogy a számlákon fel legyen tüntetve."
  }
};
const schemaMemberships = {
  "role": {
    "label": "Tisztség"
  },
  "parcelId": {
    "label": "Albetét"
  },
  "partnerId": {
    "label": "Személy"
  },
  "ownership": {
    "label": "Tulajdon",
    "share": {
      "label": "Tulajdonrész",
      "placeholder": "(pl. 1/1 vagy 1/2)"
    },
    "representor": {
      "label": "Képviselője?"
    }
  },
  "benefactorship": {
    "label": "Használat",
    "type": {
      "label": "Típus",
      "rental": "Bérlet",
      "favor": "Szívességi használat",
      "right": "Haszonélvezeti jog"
    }
  }
};

export function touchedCollections(collection) {
  return (collection._name === 'parcels')
    ? [Parcels, Parcelships, Partners, Memberships]
    : [collection];
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
      if (collection._name === 'parcels') this.dictionary = schemaParcels;
      else if (collection._name === 'parcelships') this.dictionary = schemaParcelships;
      else if (collection._name === 'partners') this.dictionary = schemaPartners;
      else if (collection._name === 'memberships') this.dictionary = schemaMemberships;
      else this.dictionary = {};
    }
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
        tdoc.relation = tdoc.relation || 'member';
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
