import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function billColumns(permissions) {
  const buttonRenderers = [];
  if (permissions.view) buttonRenderers.push(Render.buttonView);
  if (permissions.edit) buttonRenderers.push(Render.buttonEdit);
  if (permissions.statusUpdate) buttonRenderers.push(Render.buttonStatusUpdate);
  if (permissions.delete) buttonRenderers.push(Render.buttonDelete);

  const columns = [
    { data: 'serial', title: __('schemaBills.serial.label'), render: Render.formatDate },
    { data: 'createdAt', title: __('schemaBills.createdAt.label'), render: Render.formatDate },
    { data: 'issueDate', title: __('schemaBills.issueDate.label'), render: Render.formatDate },
    { data: 'valueDate', title: __('schemaBills.valueDate.label'), render: Render.formatDate },
    { data: 'dueDate', title: __('schemaBills.dueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaBills.amount.label'), render: Render.formatNumber },
    { data: 'outstanding', title: __('schemaBills.outstanding.label') },
    { data: 'paymentDate', title: __('schemaBills.paymentDate.label'), render: Render.formatDate },
    { data: 'account', title: __('schemaBills.account.label') },
    { data: 'localizer', title: __('schemaBills.localizer.label') },
    { data: 'partner', title: 'Partner' },
    { data: 'ref', title: __('schemaBills.ref.label') },
    { data: 'note', title: __('schemaBills.note.label') },
    { data: '_id', title: __('Action buttons'), render: Render.buttonGroup(buttonRenderers) },
  ];

  return columns;
}
