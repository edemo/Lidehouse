import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

export function payaccountColumns() {
  const displayLeafs = function displayLeafs(cellData, renderType, currentRow) {
    let result = '';
    cellData.forEach(c =>
      c.children.forEach(cc =>
        result += (cc.name || `${cc.parcelNo}. ${__('parcel')}`) + ', '
      )
    );
    return result;
  };

  return [
    { data: 'name', title: __('schemaPayAccounts.name.label') },
//    { data: 'type', title: __('schemaPayAccounts.type.label'), render: Render.translate },
    { data: 'children', title: __('schemaPayAccounts.children.$.children.label'), render: displayLeafs },
    { data: '_id', render: Render.buttonEdit },
    { data: '_id', render: Render.buttonDelete },
  ];
}

export function paymentColumns(accounts) {
  const columns = [
    { data: 'date', title: __('schemaPayments.date.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaPayments.amount.label') },
    { data: 'ref', title: __('schemaPayments.ref.label') },
    { data: 'note', title: __('schemaPayments.note.label') },
  ];

  accounts.forEach((account) => {
    const extractAccountLeaf = function extractAccountLeaf(cellData, renderType, currentRow) {
      return cellData ? cellData[account.name] : undefined;
    };
    columns.push({ data: 'accounts', title: account.name, render: extractAccountLeaf });
  });

  columns.push({ data: '_id', render: Render.buttonEdit });
  columns.push({ data: '_id', render: Render.buttonDelete });

  return columns;
}
