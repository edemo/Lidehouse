import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';
import { displayOutstanding } from '/imports/ui_3/helpers/api-display.js';
import './actions.js';

export function billColumns() {
  const columns = [
    { data: 'serial', title: __('schemaBills.serial.label') },
    { data: 'serialId()', title: __('schemaGeneral.serialId.label') },
    { data: 'partner()', title: 'Partner' },
    { data: 'createdAt', title: __('schemaBills.createdAt.label'), render: Render.formatDate },
    { data: 'issueDate', title: __('schemaBills.issueDate.label'), render: Render.formatDate },
    { data: 'valueDate', title: __('schemaBills.valueDate.label'), render: Render.formatDate },
    { data: 'dueDate', title: __('schemaBills.dueDate.label'), render: Render.formatDate },
    { data: 'amount', title: __('schemaBills.amount.label'), render: Render.formatNumber },
    { data: 'outstanding', title: __('schemaBills.outstanding.label'), render: displayOutstanding },
    { data: 'paymentDate', title: __('schemaBills.paymentDate.label'), render: Render.formatDate },
//    { data: 'account', title: __('schemaBills.account.label') },
//    { data: 'localizer', title: __('schemaBills.localizer.label') },
    { data: 'note', title: __('schemaBills.note.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group,
      { options: { id: cellData }, collection: 'bills', actions: '', size: 'sm' }),
    },
  ];

  return columns;
}
