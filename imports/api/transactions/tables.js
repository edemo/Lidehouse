import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { AccountSpecification } from './account-specification';

Render.journalEntries = function (cellData, renderType, currentRow) {
  const entries = cellData;
  if (!entries || !entries.length) return `<span class="label label-danger label-xs">${__('Missing')}</span> `;
  if (entries.length > 1) return `<span class="label label-warning label-xs">${__('Split')}</span> `;
  const entry = entries[0];
  return AccountSpecification.fromDoc(entry).display();
};

export function transactionColumns(permissions) {
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  const columns = [
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber },
    { data: 'debit', title: __('schemaTransactions.debit.label'), render: Render.journalEntries },
    { data: 'credit', title: __('schemaTransactions.credit.label'), render: Render.journalEntries },
    { data: 'partner', title: __('Partner') },
    { data: 'ref', title: __('schemaTransactions.ref.label') },
    { data: 'note', title: __('schemaTransactions.note.label') },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];

  return columns;
}
