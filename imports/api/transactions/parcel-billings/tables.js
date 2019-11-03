import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayLocalizer } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { getParcelBillingActionsSmall } from './actions.js';

export function parcelBillingColumns() {
  const communityId = Session.get('activeCommunityId');
  const columns = [
    { data: 'title', title: __('schemaParcelBillings.title.label') },
    { data: 'payinType', title: __('schemaParcelBillings.payinType.label') },
    { data: 'localizer', title: __('schemaParcelBillings.localizer.label'), render: l => displayLocalizer(l, communityId) },
    { data: 'consumption', title: __('schemaParcelBillings.consumption.label'), render: Render.translateWithScope('schemaMeters.service') },
    { data: 'uom', title: __('schemaParcelBillings.uom.label') },
    { data: 'unitPrice', title: __('schemaParcelBillings.unitPrice.label') },
    { data: 'projection', title: __('schemaParcelBillings.projection.label'), render: Render.translate },
    { data: 'amount', title: __('schemaParcelBillings.amount.label') },
    { data: 'createdAt', title: __('schemaGeneral.createdAt.label'), render: Render.formatDate },
    { data: 'lastAppliedAt()', title: __('schemaParcelBillings.lastAppliedAt.label'), render: Render.formatDate },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group_small, { _id: cellData, actions: getParcelBillingActionsSmall() }) },
  ];

  return columns;
}
