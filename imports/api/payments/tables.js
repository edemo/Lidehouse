import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';

Render.payAccounts = function (cellData, renderType, currentRow) {
  const accounts = cellData;
  if (!accounts) return undefined;
  let html = '';
  Object.keys(accounts).forEach(key => {
    html += `<span class="label label-default label-xs">${accounts[key]}</span>`;
  });
  return html;
};

export function paymentColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaPayments.valueDate.label'), render: Render.formatDate },
//    { data: 'phase', title: __('schemaPayments.phase.label'), render: Render.translate },
    { data: 'amount', title: __('schemaPayments.amount.label'), render: Render.formatNumber },
    { data: 'accountFrom', title: __('schemaPayments.accountFrom.label'), render: Render.payAccounts },
    { data: 'accountTo', title: __('schemaPayments.accountTo.label'), render: Render.payAccounts },
//    { data: 'placeAccounts()', title: __('Konyveles hely'), render: Render.payAccounts },
    { data: 'ref', title: __('schemaPayments.ref.label') },
    { data: 'note', title: __('schemaPayments.note.label') },
    { data: '_id', render: Render.buttonView },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];

  return columns;
}
