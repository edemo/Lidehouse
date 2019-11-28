import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function statementEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaBills.valueDate.label'), render: Render.formatDate },
    { data: 'partner', title: __('schemaBills.partnerId.label') },
    { data: 'amount', title: __('schemaBills.amount.label'), render: Render.formatNumber },
    { data: 'note', title: __('schemaBills.note.label') },
    { data: 'reconciledId', title: __('schemaBills.reconciled.label'), render: Render.checkmarkBoolean },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { options: { id: cellData }, collection: 'statementEntries', actions: 'reconcile', size: 'sm' }),
    },
  ];

  return columns;
}
