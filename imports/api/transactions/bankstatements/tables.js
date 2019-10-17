import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
//import { getBillsActionsSmall } from './actions.js';

export function bankstatementEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaBills.valueDate.label'), render: Render.formatDate },
    { data: 'partner', title: __('schemaBills.partner.label') },
    { data: 'amount', title: __('schemaBills.amount.label'), render: Render.formatNumber },
    { data: 'note', title: __('schemaBills.note.label') },
    { data: 'reconciled', title: __('schemaBills.reconciled.label'), render: Render.checkmarkBoolean },
//    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group_small, { _id: cellData, actions: getBillsActionsSmall() }) },
  ];

  return columns;
}
