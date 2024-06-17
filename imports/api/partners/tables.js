import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function partnersColumns() {
  const columns = [
    { data: 'toString()', title: __('schemaTransactions.partnerId.label') },
    { data: 'idCard.type', title: __('schemaPartners.idCard.type.label'), render: Render.translateWithScope('schemaPartners.idCard.type') },
    { data: 'relation', title: __('schemaPartners.relation.label'), render: Render.translateWithScope('schemaPartners.relation') },
    { data: 'contact.email', title: __('schemaPartners.contact.email.label') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'partners', actions: 'view,edit,merge,delete', size: 'sm' }, cell),
    },
  ];

  return columns;
}
