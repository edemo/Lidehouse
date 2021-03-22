import { Transactions } from "./transactions";
import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import '/imports/ui_3/views/components/bill-view.js';
import '/imports/ui_3/views/components/bill-edit.js';
import '/imports/ui_3/views/components/payment-view.js';
import '/imports/ui_3/views/components/payment-edit.js';
import '/imports/ui_3/views/components/transfer-edit.js';

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
//    viewForm: 'Transfer_view',
    editForm: 'Transfer_edit',
    omitFields: () => ['debit', 'credit', 'pEntries'],
    size: 'lg',
  },
  opening: {
    name: 'opening',
    omitFields: () => ['debit', 'credit', 'pEntries'],
  },
  freeTx: {
    name: 'freeTx',
    omitFields: () => ['pEntries'],
  },
};
