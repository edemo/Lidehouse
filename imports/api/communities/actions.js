import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { AccountsTemplates } from 'meteor/useraccounts:core';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Communities } from './communities.js';
import './methods.js';

Communities.actions = {
  new: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: user.hasPermission('communities.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.insert',
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
        id: 'af.community.update',
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
        id: 'af.community.update',
        collection: Communities,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'communities.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  }),
  join: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'join',
    icon: 'fa fa-suitcase',
    visible: doc.settings.joinable,
    run() {
      AccountsTemplates.forceLogin(() => {
        Modal.show('Autoform_modal', {
          title: 'pleaseSupplyParcelData',
          id: 'af.@property.insert.unapproved',
          schema: Parcels.simpleSchema({ category: '@property' }),
          //        omitFields: ['serial'],
          type: 'method',
          meteormethod: 'parcels.insert',
        });

        /*    This can be used for immediate (no questions asked) joining - with a fixed ownership share
              const communityId = FlowRouter.current().params._cid;
              const maxSerial = Math.max.apply(Math, _.pluck(Parcels.find().fetch(), 'serial')) || 0;
              Meteor.call('parcels.insert',
                { communityId, approved: false, serial: maxSerial + 1, units: 300, type: 'flat' },
                (error, result) => { onJoinParcelInsertSuccess(result); },
              );
        */
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('communities.remove', doc),
    run() {
      Modal.confirmAndCall(Communities.methods.remove, { _id: doc._id }, {
        action: 'delete community',
        message: 'You should rather archive it',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.community.insert');
AutoForm.addModalHooks('af.community.update');
