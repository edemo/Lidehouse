import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
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

export function transactionColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber },
    { data: 'debit', title: __('schemaTransactions.debit.label'), render: Render.journalEntries },
    { data: 'credit', title: __('schemaTransactions.credit.label'), render: Render.journalEntries },
    { data: 'partner()', title: __('Partner') },
    { data: 'ref', title: __('schemaTransactions.ref.label') },
    { data: 'note', title: __('schemaTransactions.note.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group, { _id: cellData, collection: 'transactions', actions: '', size: 'sm' }) },
  ];

  return columns;
}
