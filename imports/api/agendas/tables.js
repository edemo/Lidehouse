import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';

export function agendaColumns() {
  return [
    { data: 'title', title: __('schemaAgendas.title.label') },
    { data: 'topics()', title: __('schemaAgendas.topicIds.label'), render: cellData => _.pluck(cellData, 'title') },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'agendas', actions: 'edit,delete', size: 'sm' }, cell),
    },
  ];
}
