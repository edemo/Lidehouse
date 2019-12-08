import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function statementEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'partner', title: __('schemaTransactions.partnerId.label') },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber },
    { data: 'note', title: __('schemaTransactions.note.label') },
    { data: 'reconciledId', title: __('schemaTransactions.reconciled.label'), render: Render.checkmarkBoolean },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'statementEntries', actions: 'reconcile', size: 'sm' }),
    },
  ];

  return columns;
}
