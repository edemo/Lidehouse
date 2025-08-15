import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Templates } from '/imports/api/accounting/templates/templates.js';
import { Txdefs } from './txdefs.js';

export function defineTxdefTemplates() {
// Kettős könyvelés verzió

  Templates.define({ name: 'Honline Társasház Sablon', txdefs: [{
    name: 'Supplier bill', // 'Szállító számla',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['`1', '`2', '`5', '`8'],
    credit: ['`454'],
/*
  }, {
    name: 'Recording inventory', // 'Készletrevétel',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['`2'],
    credit: ['`454'],
  }, {
    name: 'Costing of inventory', // 'Készlet költség elszámolás',
    category: 'free',
    debit: ['`5'],
    credit: ['`2'],
*/
  }, {
    name: 'Supplier payment', // 'Szállító számla kifizetése',
    category: 'payment',
    data: { relation: 'supplier', paymentSubType: 'payment' },
    debit: ['`454'], debit_unidentified: ['`434'],
    credit: ['`38'],
  }, {
    name: 'Supplier payment identification', // 'Szállító kifizetés azonosítás',
    category: 'payment',
    data: { relation: 'supplier', paymentSubType: 'identification' },
    debit: ['`454'], debit_unidentified: ['`434'],
    credit: ['`434'],
  }, {
    name: 'Supplier bill remission', // 'Szállító számla elengedés',
    category: 'payment',
    data: { relation: 'supplier', paymentSubType: 'remission' },
    debit: ['`454'],
    credit: ['`1', '`2', '`5', '`8'],
  }, {
    name: 'Customer bill', // 'Vevő számla',
    category: 'bill',
    data: { relation: 'customer' },
    debit: ['`31'],
    credit: ['`9'],
  }, {
    name: 'Customer payment', // 'Vevő befizetés',
    category: 'payment',
    data: { relation: 'customer', paymentSubType: 'payment' },
    debit: ['`38'],
    credit: ['`31'], credit_unidentified: ['`431'],
  }, {
    name: 'Customer payment identification', // 'Vevő befizetés azonosítás',
    category: 'payment',
    data: { relation: 'customer', paymentSubType: 'identification' },
    debit: ['`431'],
    credit: ['`31'], credit_unidentified: ['`431'],
  }, {
    name: 'Customer bill remission', // 'Vevő számla elengedés',
    category: 'payment',
    data: { relation: 'customer', paymentSubType: 'remission' },
    debit: ['`9'],
    credit: ['`31'],
  }, {
    name: 'Parcel bill', // 'Albetét előírás',
    category: 'bill',
    data: { relation: 'member' },
    debit: ['`33'],
    credit: ['`95'],
  }, {
    name: 'Parcel payment', // 'Albetét befizetés',
    category: 'payment',
    data: { relation: 'member', paymentSubType: 'payment' },
    debit: ['`38'],
    credit: ['`33'], credit_unidentified: ['`431'],
  }, {
    name: 'Parcel payment identification', // 'Albetét befizetés azonosítás',
    category: 'payment',
    data: { relation: 'member', paymentSubType: 'identification' },
    debit: ['`431'],
    credit: ['`33'], credit_unidentified: ['`431'],
  }, {
    name: 'Parcel bill remission', // 'Albetét előírás elengedés',
    category: 'payment',
    data: { relation: 'member', paymentSubType: 'remission' },
    debit: ['`95'],
    credit: ['`33'],
  }, {
    name: 'Non identified income', // 'Nem azonosítható bevétel',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`431'],
  }, {
    name: 'Non identified expense', // 'Nem azonosítható kiadás',
    category: 'transfer',
    debit: ['`434'],
    credit: ['`38'],
  }, {
    name: 'Money transfer', // 'Átvezetés pénz számlák között',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`38'],
  },  /*
  // Készpénz felvétel bankszámláról
    name: 'Cash withdraw', // 'Készpénz felvétel',
    category: 'transfer',
    debit: ['`381'],
    credit: ['`38'],
  }, {
  // Készpénz befizetés bankszámlára pénztárból
    name: 'Cash deposit', // 'Készpénz befizetés',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`381'],
  }, {
*/

  // Receipt accouting
  {
    name: 'Income receipt', // 'Bevétel',
    category: 'receipt',
    data: { relation: 'customer' },
    debit: ['`38'],
    credit: ['`4', '`9'],
  }, {
    name: 'Expense receipt', // 'Kiadás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['`1', '`2', '`5', '`8'],
    credit: ['`38'],
  }, {
    name: 'Pass through income', // 'Átfolyó bevétel',
    category: 'receipt',
    data: { relation: 'customer' },
    debit: ['`38'],
    credit: ['`981'],
  }, {
    name: 'Pass through expense', // 'Átfolyó kiadás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['`981'],
    credit: ['`38'],
  }, /* {
    name: 'Bank fee expense', // 'Kamat  és bank  költség elszámolás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['`871'],
    credit: ['`38'],
  }, */ {
    name: 'Partner exchange', // 'Partnerek közötti átvezetés',
    category: 'exchange',
    debit: ['`454', '`31', '`33', '`431', '`434'],
    credit: ['`454', '`31', '`33', '`431', '`434'],
  }, {
    name: 'Barter', // 'Albetét előírás elengedés',
    category: 'barter',
//    data: { relation: 'member' },
    debit: ['`454'],
    credit: ['`31', '`33'],
//    debit: ['`9'],
//    credit: ['`8', '`5'],
  }, {
    name: 'Opening', // 'Nyitás',
    category: 'opening',
    debit: ['`'],
    credit: ['`'],
  }, {
    name: 'Closing', // 'Nyitás',
    category: 'closing',
    debit: ['`'],
    credit: ['`'],
  }, {
    name: 'Accounting operation', // 'Vegyes könyvelési művelet',
    category: 'freeTx',
    debit: ['`'],
    credit: ['`'],
  }],
  });
}

Txdefs.insertTemplateDoc = function insertTemplateDoc(templateId, doc) {
  const docToInsert = _.extend({ communityId: templateId }, doc);
  Txdefs.updateOrInsert({ communityId: templateId, name: doc.name }, docToInsert);
};

// To insert a new template doc: Just insert doc into the Template def
// To change anything other than the NAME on a template doc: just change it the Template def, and it will be changed at the next server start
// To change the NAME : change it the Template def AND use migration to change it in DB
// To remove a template doc: remove it from Template def AND use a migration to remove the doc from DB

if (Meteor.isServer) {
  Meteor.startup(defineTxdefTemplates);
}
