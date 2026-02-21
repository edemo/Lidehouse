import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayReading } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function metersColumns() {
  const columns = [
    { data: 'identifier', title: __('schemaMeters.identifier.label') },
    { data: 'service', title: __('schemaMeters.service.label') },
    { data: 'parcel()', title: __('schemaMeters.parcelId.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'meters', actions: 'view,edit,registerReading,editReadings,delete', size: 'sm' }, cell),
    },
    { data: '_lastReading.date', title: __('schemaMeters.lastReading.date.label'), render: Render.formatDate },
    { data: '_lastReading.value', title: __('schemaMeters.lastReading.value.label'), render: Render.formatNumber(3) },
    { data: '_lastBilling.date', title: __('schemaMeters.lastBilling.date.label'), render: Render.formatDate },
    { data: '_lastBilling.value', title: __('schemaMeters.lastBilling.value.label'), render: Render.formatNumber(3) },
    { data: 'uom', title: __('schemaMeters.uom.label') },
//    { data: 'decimals', title: __('schemaMeters.decimals.label') },
  ];

  return columns;
}
