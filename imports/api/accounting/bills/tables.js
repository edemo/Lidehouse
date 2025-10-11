import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { displayOutstanding } from '/imports/ui_3/helpers/api-display.js';
import './actions.js';
import { Transactions } from '../transactions.js';
import '../entities.js';

export function billColumns(community) {
  const columns = [
//    { data: 'serial', title: __('schemaTransactions.serial.label') },
    { data: 'serialId', title: __('schemaSerialId.serialId.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'transactions', options: { entity: Transactions.entities.bill }, actions: '', size: 'sm' }, cell),
    },
    { data: 'partner()', title: 'Partner' },
//    { data: 'createdAt', title: __('schemaTimestamped.createdAt.label'), render: Render.formatDate },
    { data: 'issueDate', title: __('schemaBills.issueDate.label'), render: Render.formatDate },
    { data: 'deliveryDate', title: __('schemaBills.deliveryDate.label'), render: Render.formatDate },
    { data: 'dueDate', title: __('schemaBills.dueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber(0) },
    { data: 'outstanding', title: __('schemaBills.outstanding.label'), render: Render.formatNumber(0) },
    { data: 'paymentDate()', title: __('schemaBills.paymentDate.label'), render: Render.formatDate },
      community?.settings?.latePaymentFees &&
    { data: 'lateValueOutstanding', title: __('schemaBills.lateValueOutstanding.label'), render: Render.formatNumber(0) },
    { data: 'choppedNotes()', title: __('schemaNoted.notes.label') },
  ];
  return columns;
}

export function receiptColumns() {
  const columns = [
//    { data: 'serial', title: __('schemaTransactions.serial.label') },
    { data: 'serialId', title: __('schemaSerialId.serialId.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'transactions', options: { entity: Transactions.entities.receipt }, actions: '', size: 'sm' }, cell),
    },
    { data: 'partner()', title: 'Partner' },
//    { data: 'createdAt', title: __('schemaTimestamped.createdAt.label'), render: Render.formatDate },
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber() },
    { data: 'choppedNotes()', title: __('schemaNoted.notes.label') },
    { data: 'reconciled', /*title: __('schemaTransactions.reconciled.label'),*/ render: Render.checkmarkBoolean },
  ];

  return columns;
}
