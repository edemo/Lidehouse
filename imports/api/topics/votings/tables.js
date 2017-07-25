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
