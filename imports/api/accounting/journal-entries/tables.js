//import { Template } from 'meteor/templating';
//import { Blaze } from 'meteor/blaze';
//import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayAccountText } from '/imports/ui_3/helpers/api-display.js';
//import '/imports/ui_3/views/blocks/action-buttons.js';

export function journalEntriesColumns() {
  const columns = [
  //  { data: 'partner().displayName()', title: 'Partner' },
    { data: 'createdAt', title: __('schemaTimestamped.createdAt.label'), render: Render.formatTime },
    { data: 'valueDate', title: __('schemaTransactions.valueDate.label'), render: Render.formatDate },
    { data: 'account', title: __('Account'), render: displayAccountText },
    { data: 'side', title: __('Side'), render: cellData => __(`schemaTransactions.${cellData}.label`).charAt(0) },
    { data: 'amount', title: __('schemaTransactions.amount.label'), render: Render.formatNumber(0) },
    { data: 'transaction().serialId', title: __('transaction') + ' ' + __('schemaTransactions.serialId.label') },
  //  { data: '_id', title: __('Action buttons'), render: Render.actionButtons,,
  //    createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
  //      { doc: cellData, collection: 'transactions', options: { entity: Transactions.entities.bill }, actions: '', size: 'sm' }, cell),
  //  },
  ];
  return columns;
}
