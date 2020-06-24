import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { defaultNewDoc } from '/imports/ui_3/lib/active-community.js';
import { getActivePartnerId } from '/imports/ui_3/lib/active-partner.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Delegations } from './delegations.js';
import './methods.js';

Delegations.actions = {
  new: (options, doc = defaultNewDoc(), user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: user.hasPermission('delegations.insert', doc),
    run() {
      const communityId = ModalStack.getVar('communityId');
      const omitFields = user.hasPermission('delegations.forOthers', { communityId }) ? [] : ['sourceId'];
      Modal.show('Autoform_modal', {
        id: 'af.delegation.insert',
        collection: Delegations,
        omitFields,
        doc,
        type: 'method',
        meteormethod: 'delegations.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('delegations.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.delegation.view',
        collection: Delegations,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user._id === doc.sourceUserId() || user._id === doc.targetUserId()
      || user.hasPermission('delegations.remove', doc),
    run() {
      const communityId = ModalStack.getVar('communityId');
      const omitFields = user.hasPermission('delegations.forOthers', { communityId }) ? [] : ['sourceId'];
      Modal.show('Autoform_modal', {
        id: 'af.delegation.update',
        collection: Delegations,
        omitFields,
        doc,
        type: 'method-update',
        meteormethod: 'delegations.update',
        singleMethodArgument: true,
      });
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user._id === doc.sourceUserId() || user._id === doc.targetUserId()
      || user.hasPermission('delegations.remove', doc),
    run() {
      let action = 'delete delegation';
      if (doc.targetUserId() === user._id) action = 'refuse delegation';
      if (doc.sourceUserId() === user._id) action = 'revoke delegation';
      Modal.confirmAndCall(Delegations.methods.remove, { _id: doc._id }, {
        action,
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.delegation.insert');
AutoForm.addModalHooks('af.delegation.update');
AutoForm.addHooks('af.delegation.insert', {
  formToDoc(doc) {
    if (!doc.sourceId) doc.sourceId = getActivePartnerId();
    return doc;
  },
  onError(formType, error) {
    if (error.error === 'err_otherPartyNotAllowed') {
      displayMessage('warning', 'Other party not allowed this activity');
      return;
    }
    if (error.error === 'err_sanityCheckFailed') {
      displayMessage('warning', 'You can not delegate to yourself');
      return;
    }
    displayError(error);
  },
}, true);
