import { _ } from 'meteor/underscore';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

import { Translator } from './translator.js';

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
