import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { PayAccounts } from '/imports/api/payaccounts/payaccounts.js';

export function paymentColumns(accounts) {
  const columns = [
    { data: 'valueDate', title: __('schemaPayments.valueDate.label'), render: Render.formatDate },
//    { data: 'phase', title: __('schemaPayments.phase.label'), render: Render.translate },
    { data: 'amount', title: __('schemaPayments.amount.label'), render: Render.formatNumber },
  ];
  accounts.forEach((account) => {
    const extractAccountLeaf = function extractAccountLeaf(cellData, renderType, currentRow) {
      const leafName = cellData[account.name];
      return leafName ? account.leafDisplay(leafName) : undefined;
    };
    columns.push({ data: 'accounts', title: account.name, render: extractAccountLeaf });
  });
  columns.push({ data: 'ref', title: __('schemaPayments.ref.label') });
  columns.push({ data: 'note', title: __('schemaPayments.note.label') });
  columns.push({ data: '_id', render: Render.buttonView });
  columns.push({ data: '_id', render: Render.buttonEdit });
  columns.push({ data: '_id', render: Render.buttonDelete });

  return columns;
}
