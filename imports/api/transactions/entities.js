import { Transactions } from "./transactions";
import { __ } from '/imports/localization/i18n.js';

Transactions.entities = {
  bill: {
    name: 'bill',
    viewForm: 'Bill_show',
    editForm: 'Bill_edit',
//    title: (doc) => __(doc.relation + '_bill') + ' ' + doc.serialId(),
    size: 'lg',
  },
  payment: {
    name: 'payment',
    fields: ['amount', 'valueDate', 'payAccount'],
  },
};

