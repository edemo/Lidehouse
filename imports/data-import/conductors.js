/* eslint-disable max-classes-per-file */
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';
import { Mongo } from 'meteor/mongo';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';

import { Translator } from './translator.js';

// Multiple collections can be imported with one import command

export class ImportPhase {
  constructor(obj) {
    _.extend(this, obj);
  }
  collection() {
    return Mongo.Collection.get(this.collectionName);
  }
  schema() {
    return this.collection().simpleSchema(this.schemaSelector);
  }
  translator() {
    return new Translator(this.collection(), this.options, 'hu', this.dictionary);
  }
}

export class ImportConductor {
  constructor(phases) {
    this._phases = phases;
    this._remainingPhases = [].concat(phases);
  }
  phases() {
    return this._phases.map(p => new ImportPhase(p));
  }
  remainingPhases() {
    return this._remainingPhases.map(p => new ImportPhase(p));
  }
  phase(index) {
    return new ImportPhase(this._phases[index]);
  }
}

function _getConductor(collection, options) {
  switch (collection._name) {
    case 'parcels': {
      debugAssert(options.format === 'default');
      return [{
        collectionName: 'parcels',
        schemaSelector: { category: '@property' },
        options,
        dictionary: {
          category: { default: '@property' },
        },
      }, {
        collectionName: 'parcelships',
        schemaSelector: undefined,
        options,
        dictionary: undefined,
      }, {
        collectionName: 'partners',
        schemaSelector: undefined,
        options,
        dictionary: {
          relation: { default: ['member'] },
          idCard: { type: { default: 'natural' } },
        },
      }, {
        collectionName: 'memberships',
        schemaSelector: { role: 'owner' },
        omitFields: ['partnerId', 'ownership.representor'],
        options,
        dictionary: {
          role: { default: 'owner' },
          ownership: { default: { share: '1/1' } },
        },
      }];
    }
    case 'transactions': {
      debugAssert(options.format === 'default');
      return [{
        collectionName: 'partners',
        schemaSelector: undefined,
        options,
        dictionary: {
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
          category: { default: 'bill' },
          relation: { default: Session.get('activePartnerRelation') },
          serialId: { formula: "'SZ/SZALL/IMP/' + index" },
          defId: { default: Txdefs.findOne({ communityId: Session.get('activeCommunityId'), category: 'bill', 'data.relation': Session.get('activePartnerRelation') })._id },
          partnerId: { formula: 'phase[0].docs[index].idCard.name' },
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
          category: { default: 'payment' },
          relation: { default: Session.get('activePartnerRelation') },
          serialId: { formula: "'FIZ/SZALL/IMP/' + index" },
          defId: { default: Txdefs.findOne({ communityId: Session.get('activeCommunityId'), category: 'payment', 'data.relation': Session.get('activePartnerRelation') })._id },
          partnerId: { formula: 'phase[0].docs[index].idCard.name' },
//          valueDate: { label: 'A számla kiegyenlítésének időpontja' },
//          valueDate: { formula: 'doc.paymentDate' },
//          amount: { label: 'Számla összege' },
//          amount: { label: 'A számla kiegyenlítésének összege' },
          debit: { default: [{ account: '`454' }] },
          credit: { default: [{ account: '`38' }] },
          status: { default: 'posted' },
          postedAt: { formula: 'doc.valueDate' },
        },
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
        collectionName: 'statementEntries',
        schemaSelector: undefined,
        options,
        dictionary,
      }];
    }
    default: {
      debugAssert(options.format === 'default');
      return [{
        collectionName: collection._name,
        schemaSelector: undefined,
        options,
        dictionary: undefined,
      }];
    }
  }
}

export function getConductor(...params) {
  const conductor = _getConductor(...params);
  conductor.forEach(p => delete p.options.collection);
  Session.set('conductor', conductor);
  return new ImportConductor(conductor);
}
