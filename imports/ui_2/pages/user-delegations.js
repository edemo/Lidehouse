/* global alert */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { onSuccess, displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { remove as removeDelegation, allow as allowDelegations } from '/imports/api/delegations/methods.js';
import { delegationFromMeColumns, delegationToMeColumns } from '/imports/api/delegations/tables.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';

import './user-delegations.html';

Template.User_delegations.onCreated(function onCreated() {
  this.subscribe('delegations.ofUser');
});

Template.User_delegations.onRendered(function onRendered() {
  const allowCheckbox = this.find('#allow');
  this.autorun(() => {
    allowCheckbox.checked = Meteor.user().settings.delegationsAllowed;
  });
});

Template.registerHelper('fromSession', function(paramName) {
  return Session.get(paramName);
});

Template.User_delegations.helpers({
  delegationsFromMeDataFn() {
    return () => {
      return Delegations.find({ sourceUserId: Meteor.userId(), scope: 'membership' }).fetch();
    };
  },
  delegationsFromMeOptionsFn() {
    return () => {
      return {
        columns: delegationFromMeColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
  delegationsToMeDataFn() {
    return () => {
      return Delegations.find({ targetUserId: Meteor.userId(), scope: 'membership' }).fetch();
    };
  },
  delegationsToMeOptionsFn() {
    return () => {
      return {
        columns: delegationToMeColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
});

Template.User_delegations.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.delegation.insert',
      collection: Delegations,
      omitFields: ['sourceUserId', 'scope'],
      type: 'method',
      meteormethod: 'delegations.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.delegation.update',
      collection: Delegations,
      omitFields: ['sourceUserId', 'scope'],
      doc: Delegations.findOne(id),
      type: 'method-update',
      meteormethod: 'delegations.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeDelegation, { _id: id }, {
      action: 'revoke delegation',
    });
  },
  'click .js-remove'(event) {
    const id = $(event.target).data('id');
    removeDelegation.call({ _id: id },
      onSuccess(res => displayMessage('success', 'refuse delegation successful'))
    );
  },
  'click #allow'(event) {
    event.preventDefault();
    const value = event.target.checked;
    const message = value ?
      'This will let others to delegate to you' :
      'This will refuse all existing delegations';
    Modal.confirmAndCall(allowDelegations, { value }, {
      action: value ? 'enable delegations' : 'disable delegations',
      message,
    });
  },
});

AutoForm.addModalHooks('af.delegation.insert');
AutoForm.addModalHooks('af.delegation.update');
AutoForm.addHooks('af.delegation.insert', {
  formToDoc(doc) {
    doc.sourceUserId = Meteor.userId();
    doc.scope = 'membership';
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
