
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeMembership } from '/imports/api/memberships/methods.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { ownershipColumns } from '/imports/api/memberships/tables.js';
import { Fraction } from 'fractional';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './parcel-owners.html';

Template.Parcel_owners_page.onCreated(function () {
});

Template.Parcel_owners_page.helpers({
  reactiveTableDataFn() {
    return () => {
      const parcelId = FlowRouter.getParam('_pid');
      return Memberships.find({ role: 'owner', parcelId }).fetch();
    };
  },
  optionsFn() {
    return () => {
      return {
        columns: ownershipColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
});

Template.Parcel_owners_page.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'afOwnershipInsert',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role'],
      type: 'method',
      meteormethod: 'memberships.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'afOwnershipUpdate',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role'],
      doc: Memberships.findOne(id),
      type: 'method-update',
      meteormethod: 'memberships.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeMembership, { _id: id }, 'remove ownership');
  },
/*  'click .js-assign'(event) {
    const communityId = Session.get('activeCommunityId');
    const parcelId = Session.get('selectedParcelId');
    const email = event.target.previousElementSibling.value;
    const user = Meteor.users.findOne({ 'emails.0.address': email });
    Meteor.call('memberships.insert', {
      communityId,
      userId: user._id,
      role: 'owner',
      parcelId,
      ownership: {
        share: new Fraction(1, 1),
      },
    }, function (err, res) {
      if (err) {
        displayError(err);
      }
      displayMessage('success', 'Assigned user');
      Session.set('selectedParcelId', undefined);
    });
  },
  'click .js-remove-user'() {
    Meteor.call('memberships.update', { _id: this._id, modifier: { $unset: { userId: '' } } }, function(err, res) {
      if (err) {
        displayError(err);
      }
    });
  },
  */
});

AutoForm.addModalHooks('afOwnershipInsert');
AutoForm.addModalHooks('afOwnershipUpdate');
AutoForm.addHooks('afOwnershipInsert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.parcelId = FlowRouter.getParam('_pid');
    doc.role = 'owner';
    return doc;
  },
});
