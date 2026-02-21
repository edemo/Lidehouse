import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayReading } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function meterReadingsColumns() {
  const columns = [
    { data: 'date', title: __('schemaMeterReadings.date.label'), render: Render.formatDate },
    { data: 'value', title: __('schemaMeterReadings.value.label'), render: Render.formatNumber(3) },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'meterReadings', actions: 'view,edit,delete', size: 'sm' }, cell),
    },
    { data: 'displayType()', title: __('schemaMeterReadings.type.label'), render: Render.translateWithScope('schemaMeterReadings.type') },
    { data: 'photo', title: __('schemaMeterReadings.photo.label'), render: Render.checkmarkBoolean },
  ];

  return columns;
}
