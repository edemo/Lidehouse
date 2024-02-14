import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import { displayAccountSet } from '/imports/ui_3/helpers/api-display.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function txdefColumns(moneyOnly = undefined) {
  return [
//    { data: 'code', title: __('schemaAccounts.code.label') }, TODO: could use the serial code part here!
    { data: 'createdAt.getTime()', title: '', render: Render.noDisplay },
    { data: 'name', title: __('schemaTxdefs.name.label'), render: Render.translate },
    { data: 'debit', title: __('schemaTxdefs.debit.label'), render: displayAccountSet },
    { data: 'credit', title: __('schemaTxdefs.credit.label'), render: displayAccountSet },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'txdefs', actions: '', size: 'sm' }, cell),
    },
  ];
}
