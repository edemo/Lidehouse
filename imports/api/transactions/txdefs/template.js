import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Templates } from '/imports/api/transactions/templates/templates.js';
//import { Txdefs } from './txdefs.js';

export function defineTxdefTemplates() {
// Kettős könyvelés verzió

  Templates.define({ _id: 'Condominium_Txdefs', txdefs: [{
    name: 'Supplier bill', // 'Szállító számla',
    category: 'bill',
    data: { relation: 'supplier' },
    debit: ['`1', '`5', '`8'],
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
    data: { relation: 'supplier' },
    debit: ['`434', '`454'],
    credit: ['`38'],
  }, {
    name: 'Supplier payment identification', // 'Szállító kifizetés azonosítás',
    category: 'payment',
    data: { relation: 'supplier', accounting: 'none', autoPosting: true },
    debit: ['`454'],
    credit: ['`434'],
  }, {
    name: 'Supplier bill remission', // 'Szállító számla elengedés',
    category: 'payment',
    data: { relation: 'supplier', accounting: 'negative' },
    debit: ['`454'],
    credit: ['`1', '`5', '`8'],
  }, {
    name: 'Customer bill', // 'Vevő számla',
    category: 'bill',
    data: { relation: 'customer' },
    debit: ['`31'],
    credit: ['`9'],
  }, {
    name: 'Customer payment', // 'Vevő befizetés',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['`38'],
    credit: ['`431', '`31'],
  }, {
    name: 'Customer payment identification', // 'Vevő befizetés azonosítás',
    category: 'payment',
    data: { relation: 'customer' },
    debit: ['`431'],
    credit: ['`31'],
  }, {
    name: 'Customer overpayment identification', // 'Vevő túlfizetés azonosítás',
    category: 'payment',
    data: { relation: 'customer', accounting: 'none', autoPosting: true },
    debit: ['`431'],
    credit: ['`31'],
  }, {
    name: 'Customer bill remission', // 'Vevő számla elengedés',
    category: 'payment',
    data: { relation: 'customer', accounting: 'negative' },
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
    data: { relation: 'member' },
    debit: ['`38'],
    credit: ['`431', '`33'],
  }, {
    name: 'Parcel payment identification', // 'Albetét befizetés azonosítás',
    category: 'payment',
    data: { relation: 'member' },
    debit: ['`431'],
    credit: ['`33'],
  }, {
    name: 'Parcel overpayment identification', // 'Albetét túlfizetés azonosítás',
    category: 'payment',
    data: { relation: 'member', accounting: 'none', autoPosting: true },
    debit: ['`431'],
    credit: ['`33'],
  }, {
    name: 'Parcel bill remission', // 'Albetét előírás elengedés',
    category: 'payment',
    data: { relation: 'member', accounting: 'negative' },
    debit: ['`95'],
    credit: ['`33'],
  }, {
    name: 'Non identified payment', // 'Nem azonosítható bevétel',
    category: 'transfer',
    debit: ['`38'],
    credit: ['`431'],
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
    debit: ['`1', '`5', '`8'],
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
  }, {
    name: 'Barter', // 'Albetét előírás elengedés',
    category: 'barter',
//    data: { relation: 'member' },
    debit: ['`454'],
    credit: ['`31', '`33'],
//    debit: ['`9'],
//    credit: ['`8', '`5'],
  }, {
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
