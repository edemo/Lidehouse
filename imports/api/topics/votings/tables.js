import { TAPi18n } from 'meteor/tap:i18n';
import { Render } from '/imports/ui_2/lib/datatable-renderers.js';

const __ = TAPi18n.__;

export function voteColumns() {
  return [
    { data: 'title', title: __('schemaVotings.title.label') },
    { data: 'createdBy()', title: __('createdBy') },
    { data: 'createdAt', title: __('createdAt'), render: Render.formatTime },
    { data: '_id', render: Render.buttonView },
  ];
}
