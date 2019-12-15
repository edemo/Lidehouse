import { __ } from '/imports/localization/i18n.js';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';

export function voteColumns() {
  return [
    { data: 'title', title: __('schemaVotings.title.label') },
    { data: 'creator()', title: __('creatorId') },
    { data: 'createdAt', title: __('createdAt'), render: Render.formatTime },
    { data: '_id', render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'topics', actions: 'view,edit,delete', size: 'sm' }),
    },
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
