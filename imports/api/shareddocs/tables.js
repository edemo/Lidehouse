import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function shareddocsColumns() {
  const columns = [
    { data: 'name', title: __('schemaShareddocs.name.label') },
    { data: 'updatedAt', title: __('schemaTimestamped.updatedAt.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'shareddocs', actions: 'delete', size: 'sm' }, cell),
    },
  ];

  return columns;
}
