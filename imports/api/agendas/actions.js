import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { Session } from 'meteor/session';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { Agendas } from './agendas.js';
import { Communities } from '/imports/api/communities/communities.js';
import { joinVideo } from '/imports/ui_3/views/common/video.js';

Agendas.actions = {
  new: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: user.hasPermission('agendas.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.agenda.insert',
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
        id: 'af.agenda.update',
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
        action: 'delete agenda',
        message: 'This will not delete topics',
      });
    },
  }),
  videoCall: (options, doc, user = Meteor.userOrNull()) => ({
    name: doc.live ? 'video end' : 'video call',
    icon: 'fa fa-video-camera',
    visible: !doc.closed() && user.hasPermission('agendas.insert', doc),
    run() {
      const api = joinVideo(user, doc);
      const modifier = {};
      if (doc.live) {
        api.executeCommand('hangup');
        $('.video-config-box').removeClass('show');
        modifier.$set = { live: false };
      } else {
        $('.video-config-box').addClass('show');
        modifier.$set = { live: true };
      }
      Meteor.call('agendas.update', { _id: doc._id, modifier });
    },
  }),
  videoJoin: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'join video',
    icon: 'fa fa-video-camera',
    visible: doc.live && user.hasPermission('agendas.inCommunity', doc),
    run() {
      $('.video-config-box').toggleClass('show');
      joinVideo(user, doc);
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.agenda.insert');
AutoForm.addModalHooks('af.agenda.update');
