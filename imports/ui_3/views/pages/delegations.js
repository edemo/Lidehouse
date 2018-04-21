/* global alert */

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { onSuccess, displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { remove as removeDelegation, allow as allowDelegations } from '/imports/api/delegations/methods.js';
import { delegationColumns, delegationFromMeColumns, delegationToMeColumns } from '/imports/api/delegations/tables.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_2/modals/confirmation.js';
import '/imports/ui_2/modals/autoform-edit.js';

import './delegations.html';

Template.Delegations.onCreated(function onCreated() {
  this.subscribe('delegations.ofUser');
});

Template.Delegations.onRendered(function onRendered() {
  const allowCheckbox = this.find('#allow');
  this.autorun(() => {
    allowCheckbox.checked = Meteor.user().settings.delegatee;
  });
});

Template.Delegations.helpers({
  delegationsDataFn() {
    return () => {
      return Delegations.find().fetch();
    };
  },
  delegationsOptionsFn() {
    return () => {
      return {
        columns: delegationColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
  delegationsFromMeDataFn() {
    return () => {
      return Delegations.find({ sourcePersonId: Meteor.userId() }).fetch();
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
      return Delegations.find({ targetPersonId: Meteor.userId() }).fetch();
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

Template.Delegations.events({
  'click .js-new'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
    Modal.show('Autoform_edit', {
      id: 'af.delegation.insert',
      collection: Delegations,
      omitFields,
      type: 'method',
      meteormethod: 'delegations.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    const communityId = Session.get('activeCommunityId');
    const omitFields = Meteor.user().hasPermission('delegations.forOthers', communityId) ? [] : ['sourcePersonId'];
    Modal.show('Autoform_edit', {
      id: 'af.delegation.update',
      collection: Delegations,
      omitFields,
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
