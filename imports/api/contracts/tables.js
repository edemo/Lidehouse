import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function contractsColumns() {
  return [
    { data: 'title', title: __('schemaContracts.title.label') },
    { data: 'partnerName()', title: __('schemaContracts.partnerId.label') },
    { data: 'relation', title: __('schemaPartners.relation.label'), render: Render.translateWithScope('schemaPartners.relation') },
//    { data: 'topics()', title: __('schemaAgendas.topicIds.label'), render: cellData => _.pluck(cellData, 'title') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'contracts', actions: '', size: 'sm' }, cell),
    },
  ];
}
