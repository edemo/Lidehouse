import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayLocalizer } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function parcelBillingColumns() {
  const columns = [
    { data: 'rank', title: __('schemaParcelBillings.rank.label'), visible: false },
    { data: 'title', title: __('schemaParcelBillings.title.label') },
//    { data: 'digit', title: __('schemaParcelBillings.digit.label') },
//    { data: 'localizer', title: __('schemaParcelBillings.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'consumption.service', title: __('schemaParcelBillings.consumption.service.label') },
    { data: 'consumption.charges.0.unitPrice', title: __('schemaParcelBillings.consumption.charges.$.unitPrice.label') },
    { data: 'consumption.charges.0.uom', title: __('schemaParcelBillings.consumption.charges.$.uom.label') },
    { data: 'projection.unitPrice', title: __('schemaParcelBillings.projection.unitPrice.label') },
    { data: 'projection.base', title: __('schemaParcelBillings.projection.base.label'), render: Render.translateWithScope('schemaParcelBillings.projection.base') },
//    { data: 'createdAt', title: __('schemaTimestamped.createdAt.label'), render: Render.formatDate },
    { data: 'lastAppliedAt().date', title: __('schemaParcelBillings.lastAppliedAt.label'), render: Render.formatDate },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'parcelBillings', actions: 'view,edit,period,apply,delete', size: 'sm' }, cell),
    },
  ];
  return columns;
}
