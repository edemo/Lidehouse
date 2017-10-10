import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';

export function paymentColumns(accounts) {
  const columns = [
    { data: 'date', title: __('schemaPayments.date.label'), render: Render.formatDate },
//    { data: 'phase', title: __('schemaPayments.phase.label'), render: Render.translate },
    { data: 'amount', title: __('schemaPayments.amount.label') },
    { data: 'ref', title: __('schemaPayments.ref.label') },
    { data: 'note', title: __('schemaPayments.note.label') },
  ];
  accounts.forEach((account) => {
    const extractAccountLeaf = function extractAccountLeaf(cellData, renderType, currentRow) {
      return cellData ? PayAccounts.leafDisplay(cellData[account.name]) : undefined;
    };
    columns.push({ data: 'accounts', title: account.name, render: extractAccountLeaf });
  });
  columns.push({ data: '_id', render: Render.buttonEdit });
  columns.push({ data: '_id', render: Render.buttonDelete });

  return columns;
}
