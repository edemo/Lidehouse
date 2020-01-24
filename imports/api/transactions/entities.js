import { Transactions } from "./transactions";
import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';

Transactions.entities = {
  bill: {
    name: 'bill',
    viewForm: 'Bill_show',
    editForm: 'Bill_edit',
//    title: (doc) => __(doc.relation + '_bill') + ' ' + doc.serialId,
    size: 'lg',
  },
  payment: {
    name: 'payment',
    fields: ['amount', 'valueDate', 'payAccount', 'bills'],
    omitFields: () => (Session.get('modalContext').billId ? ['bills'] : undefined),
  },
  remission: {
    name: 'remission',
    fields: ['amount', 'valueDate'],
  },
  barter: {
    name: 'barter',
    omitFields: () => ['debit', 'credit'],
  },
  receipt: {
    name: 'receipt',
    viewForm: 'Bill_show',
    editForm: 'Bill_edit',
    size: 'lg',
  },
  transfer: {
    name: 'transfer',
    fields: ['amount', 'valueDate', 'fromAccount', 'toAccount'],
  },
  opening: {
    name: 'opening',
    fields: ['amount', 'valueDate', 'account'],
  },
  freeTx: {
    name: 'freeTx',
  },
};

