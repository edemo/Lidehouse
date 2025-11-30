import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Session } from 'meteor/session';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Agendas } from './agendas.js';
import { joinLiveChat } from '/imports/ui_3/views/common/live-chat.js';
import '/imports/ui_3/views/modals/participation-sheet.js'
import './methods.js';

Agendas.actions = {
  create: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    visible: user.hasPermission('agendas.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.create',
        collection: Agendas,
        doc,
        type: 'method',
        meteormethod: 'agendas.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('agendas.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.view',
        collection: Agendas,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('agendas.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.edit',
        collection: Agendas,
        doc,
        type: 'method-update',
        meteormethod: 'agendas.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('agendas.remove', doc),
    run() {
      Modal.confirmAndCall(Agendas.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'agenda',
        message: 'This will not delete topics',
      });
    },
  }),
  participationSheet: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'participationSheet',
    label: 'Participation sheet',
    icon: 'fa fa-list',
    visible: (doc.getStatus() !== 'closed') && user.hasPermission('agendas.insert', doc),
    run() {
      Modal.show('Modal', {
        id: 'participationSheet.view',
        title: 'Participation sheet',
        body: 'Participation_sheet',
        bodyContext: {
          community: doc.community(),
          agenda: doc,
        },
        size: 'lg',
      });
    },
  }),
  videoCall: (options, doc, user = Meteor.userOrNull()) => ({
    name: doc.live ? 'video end' : 'video call',
    label: doc.live ? 'video end' : 'video call',
    icon: 'fa fa-video-camera',
    visible: (doc.getStatus() === 'active') && user.hasPermission('agendas.insert', doc),
    run() {
      $('iframe[id*="jitsiConferenceFrame"]').remove();
      const modifier = {};
      if (doc.live) {
        Session.set('joinedVideo', false);
        $('.live-chat-config-box').removeClass('show');
        modifier.$set = { live: false };
      } else {
        modifier.$set = { live: true };
        Meteor.setTimeout(function () {
          joinLiveChat(user, doc);
          $('.live-chat-config-box').addClass('show');
        }, 500);
      }
      Meteor.call('agendas.update', { _id: doc._id, modifier });
    },
  }),
  videoJoin: (options, doc, user = Meteor.userOrNull()) => ({
    name: Session.get('joinedVideo') ? 'leave video' : 'join video',
    label: Session.get('joinedVideo') ? 'leave video' : 'join video',
    icon: 'fa fa-video-camera',
    visible: (doc.live) && user.hasPermission('agendas.inCommunity', doc),
    run() {
      $('iframe[id*="jitsiConferenceFrame"]').remove();
      if (Session.get('joinedVideo')) {
        $('.live-chat-config-box').removeClass('show');
        Session.set('joinedVideo', false);
      } else {
        $('.live-chat-config-box').addClass('show');
        joinLiveChat(user, doc);
      }
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.agenda.create');
AutoForm.addModalHooks('af.agenda.edit');
