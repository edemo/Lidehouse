import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function statementEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaStatementEntries.valueDate.label'), render: Render.formatDate },
    { data: 'refType', title: __('schemaStatementEntries.refType.label') },
    { data: 'name', title: __('schemaStatementEntries.name.label') },
    { data: 'amount', title: __('schemaStatementEntries.amount.label'), render: Render.formatNumber(0) },
    { data: 'note', title: __('schemaStatementEntries.note.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'view,reconcile,matchedReconcile,transaction,post,unReconcile', size: 'sm' }, cell),
    },
//    { data: 'isReconciled()', /* title: __('schemaTransactions.reconciled.label'),*/ render: Render.checkmarkBoolean },
  ];

  return columns;
}

function renderLinkedTransactions(linkedTransactions, renderType, currentRow) {
  const classes = ['text-capitalize'];
  if (!linkedTransactions.isReconciledToThisSe) classes.push('text-muted');
  if (!linkedTransactions.isLive) classes.push('text-italic');
  const txs = linkedTransactions.txs;
  let text = '';
  txs?.forEach((tx, i, array) => {
    text += tx?.displayInStatement() || 'NOT FOUND TX';
    if (i < array.length - 1) text += ',<br>';
    // Maybe we could put individial buttons to each tx
    // const buttons = Blaze.renderWithData(Template.Action_buttons_group,
    //   { doc: tx, collection: 'transactions', actions: 'view,post', size: 'sm' }, cell);
  });
  return `<span class="${classes.join(' ')}">${text}</span>`;
}

export function statementEntriesWithJournalEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaStatementEntries.valueDate.label'), render: Render.formatDate },
    { data: '_id', render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'view,edit,delete', size: 'sm' }, cell),
    },
    { data: 'display()', title: __('schemaStatementEntries._.label') },
    { data: 'amount', title: __('schemaStatementEntries.amount.label'), render: Render.formatNumber(0) },
    { data: '_id', title: __('reconcile'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'reconcile,matchedReconcile,unReconcile', size: 'sm' }, cell),
    },
//    { data: 'isReconciled()', title: __('schemaTransactions.reconciled.label'), render: Render.checkmarkBoolean },
    { data: 'linkedTransactions()', title: __('schemaTransactions._.label'), render: renderLinkedTransactions },
    { data: '_id', /*title: `${__('transaction')} ${__('operations')}`,*/ render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'viewTransactions,autoReconcile,post,deleteTransactions', size: 'sm' }, cell),
    },
  ];

  return columns;
}
