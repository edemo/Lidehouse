import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayAccount } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import '/imports/api/transactions/entities.js';
import './actions.js';

export function paymentsColumns() {
  const columns = [
//    { data: 'serial', title: __('schemaTransactions.serial.label') },
    { data: 'serialId', title: __('schemaGeneral.serialId.label') },
    { data: 'partner().displayName()', title: 'Partner' },
//    { data: 'createdAt', title: __('schemaGeneral.createdAt.label'), render: Render.formatDate },
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber },
    { data: 'payAccount', title: __('schemaTransactions.payAccount.label'), render: displayAccount },
    { data: 'note', title: __('schemaTransactions.note.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => Blaze.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'transactions', options: { entity: Transactions.entities.payment }, actions: '', size: 'sm' }, cell),
    },
    { data: 'seId', /*title: __('schemaTransactions.reconciled.label'),*/ render: Render.checkmarkBoolean },
  ];

  return columns;
}
