import { Transactions } from "./transactions";
import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';

Transactions.entities = {
  bill: {
    name: 'bill',
    viewForm: 'Bill_view',
    editForm: 'Bill_edit',
    size: 'lg',
  },
  payment: {
    name: 'payment',
    viewForm: 'Payment_view',
    editForm: 'Payment_edit',
    size: 'md',
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
    viewForm: 'Bill_view',
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

