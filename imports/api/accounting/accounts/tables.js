import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { checkBoolean } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function accountColumns(moneyOnly = undefined) {
  return [
    { data: 'code', title: __('schemaAccounts.code.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'accounts', actions: '', size: 'sm' }, cell),
    },
    { data: 'name', title: __('schemaAccounts.name.label'), render: Render.translate },
    { data: 'category', title: __('schemaAccounts.category.label'), render: Render.translateWithScope('schemaAccounts.category') },
    { data: 'isGroup', title: __('schemaAccounts.isGroup.label'), render: Render.checkmarkBoolean },
    moneyOnly &&
    { data: 'BAN', title: __('schemaAccounts.BAN.label') },
    moneyOnly &&
    { data: 'primary', title: __('schemaAccounts.primary.label'), render: checkBoolean },
  ];
}

export function highlightTemplateOverrides(row, data, index) {
  const communityId = data.communityId;
  const community = Communities.findOne(communityId);
  if (!community.isTemplate) {
    $(row).addClass('tr-bold');
  }
}
