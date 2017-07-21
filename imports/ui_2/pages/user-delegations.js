/* global alert */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { Delegations } from '/imports/api/delegations/delegations.js';
import { remove as removeDelegation } from '/imports/api/delegations/methods.js';
import { delegationFromMeColumns, delegationToMeColumns } from '/imports/api/delegations/tables.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';

import './user-delegations.html';

Template.User_delegations.onCreated(function onCreated() {
  this.subscribe('delegations.ofUser');
});

Template.User_delegations.onRendered(function onRendered() {
  this.find('#allow').checked = Meteor.user().settings.delegationsEnabled;
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
    Modal.confirmAndCall(removeDelegation, { _id: id }, 'remove delegation');
  },
  'click .js-refuse'(event) {
    const id = $(event.target).data('id');
    removeDelegation.call({ _id: id }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      displayMessage('success', 'Delegation refused');
    });
  },
  'change #allow'(event) {
    const value = event.target.checked;
    Meteor.call('delegations.enable', { value }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      displayMessage('success', `Delegations ${value ? 'enabled' : 'disabled'}`);
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
