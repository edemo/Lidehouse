import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayAccount } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { getPaymentsActionsSmall } from './actions.js';

export function paymentsColumns() {
  const columns = [
    { data: 'serial', title: __('schemaBills.serial.label') },
    { data: 'serialId()', title: __('schemaGeneral.serialId.label') },
    { data: 'partner()', title: 'Partner' },
    { data: 'createdAt', title: __('schemaBills.createdAt.label'), render: Render.formatDate },
    { data: 'valueDate', title: __('schemaBills.valueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaBills.amount.label'), render: Render.formatNumber },
    { data: 'account', title: __('schemaBills.account.label'), render: displayAccount },
    { data: 'note', title: __('schemaBills.note.label') },
    { data: 'reconciledId', title: __('schemaBills.reconciled.label'), render: Render.checkmarkBoolean },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group_small, { _id: cellData, actions: getPaymentsActionsSmall() }) },
  ];

  return columns;
}
