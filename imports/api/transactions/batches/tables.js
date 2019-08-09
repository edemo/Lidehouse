import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Blaze } from 'meteor/blaze';
import { Session } from 'meteor/session';
import { __ } from '/imports/localization/i18n.js';
import { Render } from '/imports/ui_3/lib/datatable-renderers.js';
import '/imports/ui_3/views/blocks/action-buttons.js';

export function parcelBillingActions(/*permissions*/) {
  const user = Meteor.userOrNull();
  const communityId = Session.get('activeCommunityId');
  return [{
    name: 'view',
    icon: 'fa fa-eye',
    permission: user.hasPermission('parcelBillings.inCommunity', communityId),
  }, {
    name: 'edit',
    icon: 'fa fa-pencil',
    permission: user.hasPermission('parcelBillings.update', communityId),
  }, {
    name: 'apply',
    icon: 'fa fa-calendar-plus-o',
    permission: user.hasPermission('parcelBillings.apply', communityId),
  }, {
//    name: 'revert',
//    icon: 'fa fa-calendar-times-o',
//    permission: user.hasPermission('parcelBillings.revert', communityId),
//  }, {
    name: 'delete',
    icon: 'fa fa-trash',
    permission: user.hasPermission('parcelBillings.remove', communityId),
  }];
}

export function parcelBillingColumns() {
  const columns = [
    { data: 'note', title: __('schemaParcelBillings.note.label') },
    { data: 'payinType', title: __('schemaParcelBillings.payinType.label') },
    { data: 'localizer', title: __('schemaParcelBillings.localizer.label') },
    { data: 'projection', title: __('schemaParcelBillings.projection.label') },
    { data: 'amount', title: __('schemaParcelBillings.amount.label') },
    { data: 'createdAt', title: __('schemaGeneral.createdAt.label'), render: Render.formatDate },
    { data: 'useCount()', title: __('schemaParcelBillings.useCount.label') },
    { data: '_id', title: __('Action buttons'), render: cellData => Blaze.toHTMLWithData(Template.Action_buttons_group_small, { _id: cellData, actions: parcelBillingActions() }),
    },
  ];

  return columns;
}
