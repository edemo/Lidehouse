import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { handleError } from '/imports/ui_3/lib/errors.js';
import { Rooms } from '/imports/api/topics/rooms/rooms.js';
import { Delegations } from '/imports/api/delegations/delegations';
import './users.js';
import './methods.js';

Meteor.users.actions = {
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: true,
    run() {
      Modal.show('Modal', {
        id: 'User.view',
        title: 'User data page',
        body: 'Contact_long',
        bodyContext: doc,
      });
    },
  }),
  message: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'message',
    label: 'Send message',
    icon: 'fa fa-envelope',
    visible: true,
    run() {
      Rooms.goToPrivateChatRoom('private chat', doc._id);
      Modal.hideAll();
    },
  }),
  delegation: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delegation',
    label: 'delegation',
    icon: 'fa fa-share',
    visible: true,
    href: FlowRouter.path('Delegations'),
    run() {
      const communityId = getActiveCommunityId();
      Delegations.actions.create({}, { targetId: doc.partnerId(communityId) }).run();
    },
  }),
  block: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'block',
    label: doc && doc.isFlaggedBy(user._id) ? __('Unblock user') : __('Block user'),
    icon: doc && doc.isFlaggedBy(user._id) ? 'fa fa-check' : 'fa fa-ban',
    visible: true,
    run() {
      Meteor.users.methods.flag.call({ id: doc._id }, handleError);
    },
  }),
};
