import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { getParcelBillingActionsSmall } from './actions.js';

export function parcelBillingColumns() {
  const columns = [
    { data: 'note', title: __('schemaParcelBillings.note.label') },
    { data: 'payinType', title: __('schemaParcelBillings.payinType.label') },
    { data: 'localizer', title: __('schemaParcelBillings.localizer.label') },
    { data: 'projection', title: __('schemaParcelBillings.projection.label') },
    { data: 'amount', title: __('schemaParcelBillings.amount.label') },
    { data: 'createdAt', title: __('schemaGeneral.createdAt.label'), render: Render.formatDate },
    { data: 'useCount()', title: __('schemaParcelBillings.useCount.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group_small, { _id: cellData, actions: getParcelBillingActionsSmall() }) },
  ];

  return columns;
}
