import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';
import { TAPi18n } from 'meteor/tap:i18n';

import { onSuccess } from '/imports/ui_3/lib/errors.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { setMeAsParcelOwner } from '/imports/api/parcels/actions.js';
import { Communities } from './communities.js';
import './methods.js';

Communities.actions = {
  create: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'create',
    icon: 'fa fa-plus',
    visible: user.hasPermission('communities.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.create',
        collection: Communities,
        type: 'method',
        meteormethod: 'communities.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('communities.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.view',
        collection: Communities,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.edit',
        collection: Communities,
        doc,
        type: 'method-update',
        meteormethod: 'communities.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.edit',
        collection: Communities,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'communities.update',
        singleMethodArgument: true,
      });
    },
  }),
  join: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'join',
    icon: 'fa fa-suitcase',
    label: doc.settings.joinable === 'withLink' ? 'join' : 'submit join request',
    visible: doc.settings && doc.joinable?.(),
    run() {
      const communityId = doc._id;
      const community = Communities.findOne(communityId);
      if (user.hasJoinedCommunity(communityId)) {  // should not let same person join twice
        FlowRouter.go('App home');
        return;
      }
      if (doc.status === 'sandbox' || doc.usesBlankParcels()) {   // Sandboxes have immediate (no questions asked) joining, with a fixed ownership share
        let units, type;
        if (doc.status === 'sandbox') {
          const language = doc.settings.language;
          type = TAPi18n.__('schemaParcels.type.flat', {}, language);
          units = 100;
        }
        Meteor.call('parcels.insert', 
          { communityId, category: community.propertyCategory(), approved: false, ref: 'auto' , units, type },
          onSuccess(res => setMeAsParcelOwner(res, communityId, onSuccess(r => FlowRouter.go('App home')),
          )),
        );
      } else {
        Modal.show('Autoform_modal', {
          title: 'pleaseSupplyParcelData',
          id: 'af.property.create.unapproved',
          schema: Parcels.simpleSchema({ category: community.propertyCategory() }),
          doc: { communityId },
          fields: ['communityId', 'ref', 'type', 'building', 'floor', 'door'],
          type: 'method',
          meteormethod: 'parcels.insert',
        });
      }
    },
  }),
  close: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'close',
    icon: 'fa fa-archive',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.confirmAndCall(Communities.methods.close, { _id: doc._id }, {
        action: 'close',
        entity: 'community',
        message: 'It will become read only',
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('communities.remove', doc),
    run() {
      Modal.confirmAndCall(Communities.methods.remove, { _id: doc._id }, {
        action: 'delete',
        entity: 'community',
        message: 'It will disappear forever',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.community.create');
AutoForm.addModalHooks('af.community.edit');

AutoForm.addHooks('af.community.create', {
  formToDoc(doc) {
    if (doc.settings.modules.length === Communities.availableModules.length) delete doc.settings.modules;
    return doc;
  },
});
