import { Transactions } from './transactions.js';

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
    size: 'lg',
  },
  exchange: {
    name: 'exchange',
    viewForm: 'Exchange_edit',
    editForm: 'Exchange_edit',
    omitFields: () => ['debit', 'credit'],
    size: 'lg',
  },
  receipt: {
    name: 'receipt',
    viewForm: 'Bill_view',
    editForm: 'Bill_edit',
    size: 'lg',
  },
  transfer: {
    name: 'transfer',
    viewForm: 'Transfer_edit',
    editForm: 'Transfer_edit',
    omitFields: () => ['debit', 'credit'],
    size: 'lg',
  },
  opening: {
    name: 'opening',
    omitFields: () => [],
  },
  closing: {
    name: 'closing',
    omitFields: () => [],
  },
  freeTx: {
    name: 'freeTx',
    omitFields: () => [],
  },
};
