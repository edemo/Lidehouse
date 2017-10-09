import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Accounts } from 'meteor/accounts-base';

import { Memberships } from '/imports/api/memberships/memberships.js';
import { roleshipColumns } from '/imports/api/memberships/tables.js';
import { update as updateMembership, remove as removeMembership } from '/imports/api/memberships/methods.js';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './community-roleships.html';

Template.Community_roleships_page.onCreated(function () {
});

Template.Community_roleships_page.helpers({
  reactiveTableDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Memberships.find({ communityId, role: { $not: { $in: ['owner', 'benefactor', 'guest'] } } }).fetch();
    };
  },
  optionsFn() {
    return () => {
      return {
        columns: roleshipColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
});

Template.Community_roleships_page.events({
  'click .js-new'() {
    Modal.show('Autoform_edit', {
      id: 'af.roleship.insert',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'idCard'],
      type: 'method',
      meteormethod: 'memberships.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.roleship.update',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'idCard'],
      doc: Memberships.findOne(id),
      type: 'method-update',
      meteormethod: 'memberships.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
      resetOnSuccess: false,
    });
  },
  'click .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.roleship.view',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'idCard'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeMembership, { _id: id }, {
      action: 'delete roleship',
    });
  },
});

/*
export function email2invite(email) {
  const user = Meteor.users.findOne({ 'emails.0.address': email });
  if (user) return;
  Modal.show('Confirmation', {
    action: 'invite user',
    body: 'No such email registered, an invite will be sent',
    onOK() {
      const id = Accounts.createUser({ email });
    },
  });
  // TODO: Send invitation email with membership details
  displayMessage('warning', `An invitation was sent to ${email}`);
}
*/

let lastDocId;  // in case of update, we don't get the doc id passed in the onSuccess callback

AutoForm.addModalHooks('af.roleship.insert');
AutoForm.addModalHooks('af.roleship.update');
AutoForm.addHooks(['af.roleship.insert', 'af.roleship.update', 'af.roleship.view'], {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
  formToModifier(mod) {
    return mod;
  },
  docToForm(doc) {
    lastDocId = doc._id;  // only called for update
    return doc;
  },
/*  onSuccess(formType, result) {
    debugger;
    if (formType === 'method') lastDocId = result;    // only called for insert (result is not set when update)
    const lastDoc = Memberships.findOne(lastDocId);
    lastDoc.checkEmail();
  },
*/
});
