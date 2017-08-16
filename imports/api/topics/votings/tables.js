import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

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
    { data: 'voteResult', title: __('casted vote') },
    { data: 'votePath', title: __('vote path'), render: Render.translate },
  ];
}
