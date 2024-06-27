import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { ReactiveDatatable } from 'meteor/ephemer:reactive-datatables';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';

export function voteColumns() {
  return [
    { data: 'title', title: __('schemaVotings.title.label') },
    { data: 'creator().displayOfficialName()', title: __('creatorId') },
    { data: 'createdAt', title: __('createdAt'), render: Render.formatTime },
    { data: '_id', title: __('Action buttons'), render: Render.actionButtons,
      createdCell: (cell, cellData, rowData) => ReactiveDatatable.renderWithData(Template.Action_buttons_group,
        { doc: cellData, collection: 'topics', actions: 'view,edit,statusChange,delete', size: 'sm' }, cell),
    },
  ];
}

export function voteResultsColumns() {
  return [
    { data: 'voter()', title: __('voter') },
    { data: 'votingShare', title: __('votingShare'), render: Render.formatNumber(0) },
    { data: 'voteResultDisplay()', title: __('casted vote'), render: Render.translate },
    { data: 'votePathDisplay()', title: __('vote path'), render: Render.translate },
  ];
}
