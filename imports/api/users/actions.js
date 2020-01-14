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
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => true,
    run(options, doc) {
      Modal.show('Modal', {
        title: 'User data page',
        body: 'Contact_long',
        bodyContext: doc,
      });
    },
  },
  message: {
    name: 'message',
    label: () => 'Send message',
    icon: () => 'fa fa-envelope',
    visible: () => true,
    run(options, doc) {
      Rooms.goToRoom('private chat', doc._id);
      Modal.hideAll();
    },
  },
  delegation: {
    name: 'delegation',
    icon: () => 'fa fa-share',
    visible: () => true,
    href: () => FlowRouter.path('Delegations'),
    run(options, doc) {
      const communityId = getActiveCommunityId();
      Delegations.actions.new.run({}, { targetId: doc.partnerId(communityId) });
    },
  },
  block: {
    name: 'block',
    label(options, doc) {
      return doc && doc.isFlaggedBy(Meteor.userId()) ? __('Unblock user') : __('Block user');
    },
    icon(options, doc) {
      return doc && doc.isFlaggedBy(Meteor.userId()) ? 'fa fa-check' : 'fa fa-ban';
    },
    visible: () => true,
    run(options, doc) {
      Meteor.users.methods.flag.call({ id: doc._id }, handleError);
    },
  },
};
