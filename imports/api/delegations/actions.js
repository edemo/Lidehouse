import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Delegations } from './delegations.js';
import './methods.js';

Delegations.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: (options, doc) => currentUserHasPermission('delegations.insert', doc),
    run(options, doc) {
      const communityId = Session.get('activeCommunityId');
      const omitFields = Meteor.user().hasPermission('delegations.forOthers', { communityId }) ? [] : ['sourcePersonId'];
      Modal.show('Autoform_modal', {
        id: 'af.delegation.insert',
        collection: Delegations,
        omitFields,
        doc,
        type: 'method',
        meteormethod: 'delegations.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: (options, doc) => currentUserHasPermission('delegations.inCommunity', doc),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.delegation.view',
        collection: Delegations,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: (options, doc) => {
      if (Meteor.userId() === doc.sourcePersonId || Meteor.userId() === doc.targetPersonId) return true;
      return currentUserHasPermission('delegations.remove', doc);
    },
    run(options, doc) {
      const communityId = Session.get('activeCommunityId');
      const omitFields = Meteor.user().hasPermission('delegations.forOthers', { communityId }) ? [] : ['sourcePersonId'];
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
  },
  delete: {
    name: 'delete',
    icon: () => 'fa fa-trash',
    visible: (options, doc) => {
      if (Meteor.userId() === doc.sourcePersonId || Meteor.userId() === doc.targetPersonId) return true;
      return currentUserHasPermission('delegations.remove', doc);
    },
    run(options, doc) {
      let action = 'delete delegation';
      if (doc.targetPersonId === Meteor.userId()) action = 'refuse delegation';
      if (doc.sourcePersonId === Meteor.userId()) action = 'revoke delegation';
      Modal.confirmAndCall(Delegations.methods.remove, { _id: doc._id }, {
        action,
      });
    },
  },
};

//-----------------------------------------------

AutoForm.addModalHooks('af.delegation.insert');
AutoForm.addModalHooks('af.delegation.update');
AutoForm.addHooks('af.delegation.insert', {
  formToDoc(doc) {
    if (!doc.sourcePersonId) doc.sourcePersonId = Meteor.userId();
    return doc;
  },
  onError(formType, error) {
    if (error.error === 'err_otherPartyNotAllowed') {
      displayMessage('warning', 'Other party not allowed this activity');
      return;
    }
    displayError(error);
  },
  onSuccess() {
    Modal.hideAll();
  },
}, true);
