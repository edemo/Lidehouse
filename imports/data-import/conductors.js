/* eslint-disable max-classes-per-file */
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';
import { Mongo } from 'meteor/mongo';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Translator } from './translator.js';
import { Transformers } from './transformers.js';

// Multiple collections can be imported with one import command

export class ImportPhase {
  collection() {
    return Mongo.Collection.get(this.collectionName);
  }
  schema() {
    return this.collection().simpleSchema(this.schemaSelector);
  }
  translator() {
    const translator = new Translator(this.collection(), this.options, 'hu', this.dictionary);
    translator.phase = this;
    translator.conductor = this.conductor;
    return translator;
  }
  transformer() {
    return Transformers[this.collectionName]?.[this.options?.transformer || 'default']
      || (docs => docs.map(doc => Object.deepClone(doc)));
  }
}
ImportPhase.Instance = new ImportPhase();
ImportPhase.from = obj => { Object.setPrototypeOf(obj, ImportPhase.Instance); return obj; };

export class ImportConductor {
  init() {
    this.phases.forEach(p => { p.conductor = this; ImportPhase.from(p); });
    this.name = `${this.collectionName}#${this.format}`;
    this.phaseIndex = -1;
  }
  nextPhase() {
    this.phaseIndex += 1;
    const phase = this.phases[this.phaseIndex];
    return phase;
  }
  currentPhase() {
    const phase = this.phases[this.phaseIndex];
    return phase;
  }
}
ImportConductor.Instance = new ImportConductor();
ImportConductor.from = obj => { Object.setPrototypeOf(obj, ImportConductor.Instance); return obj; };

function _getConductor(collection, options) {
  switch (collection._name) {
    case 'parcels': {
      options.format = 'ehaz';
      if (options.format === 'default') {
        return {
          collectionName: 'parcels',
          format: options.format,
          phases: [{
            collectionName: 'parcels',
            schemaSelector: { category: '@property' },
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              category: { default: '@property' },
            },
          }, {
            collectionName: 'parcelships',
            schemaSelector: undefined,
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
            },
          }, {
            collectionName: 'partners',
            schemaSelector: undefined,
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              relation: { default: ['member'] },
              idCard: { type: { default: 'natural' } },
            },
          }, {
            collectionName: 'memberships',
            schemaSelector: { role: 'owner' },
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              role: { default: 'owner' },
  //            parcelId: { formula: 'conductor.phases[1].docs[index].parcelId' },
  //            partnerId: { formula: 'conductor.phases[2].docs[index].idCard.name' },
              ownership: { default: { share: '1/1' } },
            },
          }],
        };
      } else if (options.format === 'ehaz') {
        return {
          collectionName: 'parcels',
          format: options.format,
          phases: [{
            collectionName: 'parcels',
            schemaSelector: { category: '@property' },
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              category: { default: '@property' },
              type: {
                flat: 'L',
                parking: 'P',
                storage: 'T',
                cellar: 'Q',
                attic: '?',
                shop: 'U',
                office: 'I',
                other: '-',
              },
            },
          }, {
            collectionName: 'partners',
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              relation: { default: ['member'] },
              idCard: {
                type: {
                  natural: 'T',
                  legal: 'G',
                  other: 'E',
                },
              },
            },
          }, {
            collectionName: 'partners',
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              relation: { default: ['member'] },
            },
          }, {
            collectionName: 'partners',
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              relation: { default: ['member'] },
            },
          }, {
            collectionName: 'partners',
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              relation: { default: ['member'] },
            },
          }, {
            collectionName: 'memberships',
            schemaSelector: { role: 'owner' },
            options,
            dictionary: {
              communityId: { default: getActiveCommunityId() },
              role: { default: 'owner' },
  //            parcelId: { formula: 'conductor.phases[1].docs[index].parcelId' },
  //            partnerId: { formula: 'conductor.phases[2].docs[index].idCard.name' },
              ownership: { default: { share: '1/1' } },
            },
          }],
        };
      } else { debugAssert(false); return []; }
    }
    case 'transactions': {
      debugAssert(options.format === 'default');
      return {
        collectionName: 'transactions',
        format: options.format,
        phases: [{
          collectionName: 'partners',
          schemaSelector: undefined,
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['supplier'] },
            idCard: {
              type: { default: 'legal' },
  //            name: { label: 'Szállító neve adóigazgatási azonosító száma' }, -> columnMapping
            },
          },
        }, {
          collectionName: 'transactions',
          schemaSelector: { category: 'bill' },
          options: _.extend({}, options, { entity: 'bill' }),
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: 'bill' },
            relation: { default: Session.get('activePartnerRelation') },
            serialId: { formula: "'SZ/SZALL/IMP/' + index" },
            defId: { default: Txdefs.findOne({ communityId: Session.get('activeCommunityId'), category: 'bill', 'data.relation': Session.get('activePartnerRelation') })._id },
            partnerId: { formula: 'conductor.phases[0].docs[index].idCard.name' },
            deliveryDate: { formula: 'doc.deliveryDate || doc.issueDate' },
            dueDate: { formula: 'doc.dueDate || doc.issueDate' },
            title: { formula: 'doc.title || "---"' },
            debit: { default: [{ account: '`8' }] },
            credit: { default: [{ account: '`454' }] },
            status: { default: 'posted' },
            postedAt: { formula: 'doc.issueDate' },
          },
        }, {
          collectionName: 'transactions',
          schemaSelector: { category: 'payment' },
          options: _.extend({}, options, { entity: 'payment' }),
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: 'payment' },
            relation: { default: Session.get('activePartnerRelation') },
            serialId: { formula: "'FIZ/SZALL/IMP/' + index" },
            defId: { default: Txdefs.findOne({ communityId: Session.get('activeCommunityId'), category: 'payment', 'data.relation': Session.get('activePartnerRelation') })._id },
            partnerId: { formula: 'conductor.phases[0].docs[index].idCard.name' },
  //          valueDate: { label: 'A számla kiegyenlítésének időpontja' },
  //          valueDate: { formula: 'doc.paymentDate' },
  //          amount: { label: 'Számla összege' },
  //          amount: { label: 'A számla kiegyenlítésének összege' },
            debit: { default: [{ account: '`454' }] },
            credit: { default: [{ account: '`38' }] },
            status: { default: 'posted' },
            postedAt: { formula: 'doc.valueDate' },
          },
        }],
      };
    }
    case 'statementEntries': {
      const account = Accounts.findOne({ communityId: options.communityId, code: options.account });
      const format = account.bank || 'cash';
      const dictionary = {
        communityId: { default: getActiveCommunityId() },
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
      return {
        collectionName: 'statementEntries',
        format,
        phases: [{
          collectionName: 'statementEntries',
          schemaSelector: undefined,
          options,
          dictionary,
        }],
      };
    }
    default: {
      debugAssert(options.format === 'default');
      return {
        collectionName: collection._name,
        format: options.format,
        phases: [{
          collectionName: collection._name,
          schemaSelector: undefined,
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
          },
        }],
      };
    }
  }
}

export function getConductor(collection, options) {
  const conductorRaw = _getConductor(collection, options);
  const phases = conductorRaw.phases;
  phases.forEach(p => delete p.options.collection);
  const conductor = ImportConductor.from(conductorRaw);
  conductor.init();
  return conductor;
}
