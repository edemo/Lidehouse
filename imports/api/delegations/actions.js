import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';

import { __ } from '/imports/localization/i18n.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { handleError, onSuccess, displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Delegations } from './delegations.js';
import './methods.js';

Delegations.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('delegations.insert'),
    run(options) {
      const communityId = Session.get('activeCommunityId');
      const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
      Modal.show('Autoform_edit', {
        id: 'af.delegation.insert',
        collection: Delegations,
        omitFields,
        doc: options,
        type: 'method',
        meteormethod: 'delegations.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('delegations.inCommunity'),
    run(options, doc) {
      Modal.show('Autoform_edit', {
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
    visible: () => currentUserHasPermission('delegations.update'),
    run(options, doc) {
      const communityId = Session.get('activeCommunityId');
      const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
      Modal.show('Autoform_edit', {
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
    visible: () => currentUserHasPermission('delegations.remove'),
    run(options, doc) {
      Modal.confirmAndCall(Delegations.methods.remove, { _id: doc._id }, {
        action: 'delete delegation',
        message: 'This will not delete topics',
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
});
AutoForm.addHooks('af.delegation.insert', {
  onError(formType, error) {
    if (error.error === 'err_otherPartyNotAllowed') {
      displayMessage('warning', 'Other party not allowed this activity');
      return;
    }
    displayError(error);
  },
}, true);
