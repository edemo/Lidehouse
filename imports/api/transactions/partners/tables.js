import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function partnersColumns() {
  const columns = [
    { data: 'toString()', title: __('schemaBills.partnerId.label') },
    { data: 'outstanding', title: __('schemaBills.outstanding.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group, { _id: cellData, collection: 'partners', actions: '', size: 'sm' }) },
  ];

  return columns;
}
