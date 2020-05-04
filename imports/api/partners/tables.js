import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function partnersColumns() {
  const columns = [
    { data: 'toString()', title: __('schemaTransactions.partnerId.label') },
    { data: 'idCard.type', title: __('schemaPartners.idCard.type.label'), render: Render.translateWithScope('schemaPartners.idCard.type.options') },
    { data: 'relation', title: __('schemaPartners.relation.label'), render: Render.translateWithScope('schemaPartners.relation.options') },
    { data: 'contact.email', title: __('schemaPartners.contact.email.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => Blaze.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'partners', actions: 'view,edit,delete', size: 'sm' }, cell),
    },
  ];

  return columns;
}

export function partnersFinancesColumns() {
  const columns = [
    { data: 'toString()', title: __('schemaTransactions.partnerId.label') },
    { data: 'outstanding', title: __('schemaBills.outstanding.label'), render: Render.formatNumber },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => Blaze.renderWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'partners', actions: '', size: 'sm' }, cell),
    },
  ];

  return columns;
}
