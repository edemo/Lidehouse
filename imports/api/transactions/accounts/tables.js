import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function accountColumns() {
  return [
    { data: 'code', title: __('schemaAccounts.code.label') },
    { data: 'name', title: __('schemaAccounts.name.label'), render: Render.translate },
    { data: 'category', title: __('schemaAccounts.category.label'), render: Render.translateWithScope('schemaAccounts.category') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'accounts', actions: '', size: 'sm' }, cell),
    },
  ];
}
