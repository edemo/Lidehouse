import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { _ } from 'meteor/underscore';
import { __ } from '/imports/localization/i18n.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function contractColumns() {
  return [
    { data: 'title', title: __('schemaAgendas.title.label') },
    { data: 'topics()', title: __('schemaAgendas.topicIds.label'), render: cellData => _.pluck(cellData, 'title') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group, { _id: cellData, collection: 'contracts', actions: '', size: 'sm' }) },
  ];
}
