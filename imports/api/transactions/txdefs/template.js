import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Templates } from '/imports/api/transactions/templates/templates.js';
//import { Txdefs } from './txdefs.js';

export function defineTxdefTemplates() {
// Kettős könyvelés verzió

  Templates.define({ _id: 'Condominium_Txdefs', txdefs: [{
    name: 'Supplier bill', // 'Bejövő számla',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['`1', '`5', '`8', '`434'],
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
    name: 'Supplier payment', // 'Bejövő számla kifizetése',
    category: 'payment',
    data: { relation: 'supplier' },
    debit: ['`454', '`434'],
    credit: ['`38'],
  }, {
//    Not really needed. When paying bills we always know what bills are we intending to pay
//    name: 'Supplier payment identification', // 'Bejövő számla kifizetés azonosítása',
//    category: 'identification',
//    data: { relation: 'supplier' },
//    debit: ['`454'],
//    credit: ['`454'],
//  }, {
    name: 'Supplier bill remission', // 'Bejövő számla elengedés',
    category: 'payment',
    data: { relation: 'supplier', remission: true },
    debit: ['`454'],
    credit: ['`969'],
  }, {
    name: 'Customer bill', // 'Kimenő számla',
    category: 'bill',
    data: { relation: 'customer' },
    debit: ['`31'],
    credit: ['`9', '`431'],
  }, {
    name: 'Customer payment', // 'Kimenő számla befolyás',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['`38'],
    credit: ['`31', '`431'],
  }, {
//    name: 'Customer payment identification', // 'Kimenő számla befolyás azonosítása',
//    category: 'identification',
//    data: { relation: 'customer' },
//    debit: ['`31'],
//    credit: ['`31'],
//  }, {
    name: 'Customer bill remission', // 'Kimenő számla elengedés',
    category: 'payment',
    data: { relation: 'customer', remission: true },
    debit: ['`969'],
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
    data: { relation: 'member' },
    debit: ['`38', '`43'],
    credit: ['`33'],
  }, {
//    name: 'Parcel payment identification', // 'Albetét befizetés azonosítása',
//    category: 'identification',
//    data: { relation: 'member' },
//    debit: ['`33'],
//    credit: ['`33'],
//  }, {
    name: 'Parcel bill remission', // 'Albetét előírás elengedés',
    category: 'payment',
    data: { relation: 'member', remission: true },
    debit: ['`95'],
    credit: ['`33'],
  }, {
/*
  // Nem azonosított bevételek kezelése 
  // Befolyás
    name: 'Non identified payment', // 'Nem azonosított befolyás',
    category: 'payment',
    debit: ['`38'],
    credit: ['`43'],
  }, {
  // Azonosítás - Identification
    name: 'Identification', // 'Azonosítás',
    debit: ['`43'],
    credit: ['`3'],
  }, {
*/
    name: 'Money transfer', // 'Átvezetés pénz számlák között',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`38'],
  }, /* {
    name: 'Unidentified income', // "Nem azonosított bevétel",
    category: 'freeTx',
    debit: ['`38'],
    credit: ['`43'],
  }, {
    name: 'Unidentified expense', // "Nem azonosított kiadás",
    category: 'freeTx',
    debit: ['`43'],
    credit: ['`38'],
  }, */
  /*
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
    debit: ['`1', '`5', '`8'],
    credit: ['`38'],
  }, /* {
    name: 'Income identification', // 'Bevétel beazonosítás',
    category: 'freeTx',
    debit: ['`431'],
    credit: ['`4', '`9'],
  }, {
    name: 'Expense identification', // 'Kiadás azonosítás',
    category: 'freeTx',
    debit: ['`434'],
    credit: ['`1', '`5', '`8'],
  }, */{
    name: 'Bank fee expense', // 'Kamat  és bank  költség elszámolás',
    category: 'receipt',
    data: { relation: 'supplier' },
    debit: ['`871'],
    credit: ['`38'],
  }, {
    name: 'Partner exchange', // 'Partnerek közötti átvezetés',
    category: 'exchange',
  }, /* {
    name: 'Barter', // 'Albetét előírás elengedés',
    category: 'barter',
//    data: { relation: 'member' },
    debit: ['`454'],
    credit: ['`31', '`33'],
//    debit: ['`9'],
//    credit: ['`8', '`5'],
  }, */ {
    name: 'Opening asset',
    category: 'opening',
    data: { side: 'debit' },
    debit: ['`1', '`2', '`3', '`5', '`8'],
    credit: ['`491'],
  }, {
    name: 'Opening liability',
    category: 'opening',
    data: { side: 'credit' },
    debit: ['`491'],
    credit: ['`4', '`9'],
  }, {
    name: 'Closing asset',
    category: 'opening',
    data: { side: 'credit' },
    debit: ['`492'],
    credit: ['`1', '`2', '`3', '`5', '`8'],
  }, {
    name: 'Closing liability',
    category: 'opening',
    data: { side: 'debit' },
    debit: ['`4', '`9'],
    credit: ['`492'],
  }, {
    name: 'Accounting operation', // 'Könyvelési művelet',
    category: 'freeTx',
    debit: ['`'],
    credit: ['`'],
  }],
  });
}

if (Meteor.isServer) {
  Meteor.startup(defineTxdefTemplates);
}
