import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function statementEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaStatementEntries.valueDate.label'), render: Render.formatDate },
    { data: 'name', title: __('schemaStatementEntries.name.label') },
    { data: 'amount', title: __('schemaStatementEntries.amount.label'), render: Render.formatNumber },
    { data: 'note', title: __('schemaStatementEntries.note.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'statementEntries', actions: '', size: 'sm' }),
    },
    { data: 'reconciledId', /*title: __('schemaTransactions.reconciled.label'),*/ render: Render.checkmarkBoolean },
  ];

  return columns;
}
