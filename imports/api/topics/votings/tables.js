import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function voteColumns() {
  return [
    { data: 'title', title: __('schemaVotings.title.label') },
    { data: 'createdBy()', title: __('createdBy') },
    { data: 'createdAt', title: __('createdAt'), render: Render.formatTime },
    { data: '_id', render: Render.buttonView },
  ];
}

export function voteResultsColumns() {
  return [
    { data: 'voter()', title: __('voter') },
    { data: 'votingShare', title: __('votingShare') },
    { data: 'voteResultDisplay()', title: __('casted vote'), render: Render.translate },
    { data: 'votePathDisplay()', title: __('vote path'), render: Render.translate },
  ];
}
