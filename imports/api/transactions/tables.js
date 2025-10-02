import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs';
import { displayAccountSpecification } from '/imports/ui_3/helpers/api-display.js';
import { AccountSpecification } from './account-specification';
import './actions.js';

Render.journalEntries = function (cellData, renderType, currentRow) {
  const entries = cellData;
  if (!entries || !entries.length) return `<span class="label label-danger label-xs">${__('Missing')}</span> `;
  if (entries.length > 1) return `<span class="label label-warning label-xs">${__('Split')}</span> `;
  const entry = entries[0];
  return displayAccountSpecification(AccountSpecification.fromDoc(entry));
};

Render.txdefName = function (cellData, renderType, currentRow) {
  const def = Txdefs.findOne(cellData);
  return def && __(def.name);
};

export function transactionColumns() {
  const columns = [
    { data: 'createdAt', title: __('schemaTimestamped.createdAt.label'), render: Render.formatTime },
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'serialId', title: __('schemaSerialId.serialId.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'transactions', actions: '', size: 'sm' }, cell),
    },
    { data: 'defId', title: __('schemaTransactions.defId.label'), render: Render.txdefName },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber(0) },
    { data: 'debit', title: __('schemaTransactions.debit.label'), render: Render.journalEntries },
    { data: 'credit', title: __('schemaTransactions.credit.label'), render: Render.journalEntries },
    { data: 'choppedNotes()', title: __('schemaNoted.notes.label') },
    { data: 'reconciled', /*title: __('schemaTransactions.reconciled.label'),*/ render: Render.checkmarkBoolean },
  ];

  return columns;
}
