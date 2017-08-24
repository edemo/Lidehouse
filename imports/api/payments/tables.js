import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function paymentColumns() {
  return [
    { data: 'date', title: __('schemaPayments.date.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaPayments.amount.label') },
    { data: 'ref', title: __('schemaPayments.ref.label') },
    { data: 'note', title: __('schemaPayments.note.label') },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}
