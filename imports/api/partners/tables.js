import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import './actions.js';

export function partnersColumns() {
  const columns = [
    { data: 'toString()', title: __('schemaTransactions.partnerId.label') },
    { data: 'outstanding', title: __('schemaBills.outstanding.label'), render: Render.formatNumber },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { doc: cellData, collection: 'partners', actions: '', size: 'sm' }),
    },
  ];

  return columns;
}
