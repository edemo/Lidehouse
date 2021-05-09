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

export function statementEntriesWithJournalEntriesColumns() {
  const columns = [
    { data: 'valueDate', title: __('schemaStatementEntries.valueDate.label'), render: Render.formatDate },
    { data: '_id', render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'view', size: 'sm' }, cell),
    },
    { data: 'display()', title: __('schemaStatementEntries._.label') },
    { data: 'amount', title: __('schemaStatementEntries.amount.label'), render: Render.formatNumber(0) },
    { data: '_id', title: __('reconcile'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'reconcile,matchedReconcile,unReconcile', size: 'sm' }, cell),
    },
//    { data: 'isReconciled()', /* title: __('schemaTransactions.reconciled.label'),*/ render: Render.checkmarkBoolean },
    { data: '_id', render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'statementEntries', actions: 'transaction,autoReconcile,post', size: 'sm' }, cell),
    },
    { data: 'displayMatch()', title: __('schemaTransactions._.label') },
  ];

  return columns;
}
