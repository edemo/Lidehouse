import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function parcelBillingColumns(permissions) {
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
//  if (permissions.apply) buttonRenderers.push(Render.buttonApply);
//  if (permissions.revert) buttonRenderers.push(Render.buttonRevert);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  const columns = [
    { data: 'note', title: __('schemaParcelBillings.note.label') },
    { data: 'payinType', title: __('schemaParcelBillings.payinType.label') },
    { data: 'localizer', title: __('schemaParcelBillings.localizer.label') },
    { data: 'projection', title: __('schemaParcelBillings.projection.label') },
    { data: 'amount', title: __('schemaParcelBillings.amount.label') },
    { data: 'createdAt', title: __('schemaGeneral.createdAt.label'), render: Render.formatDate },
    { data: 'useCount()', title: __('schemaParcelBillings.useCount.label') },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];

  return columns;
}
