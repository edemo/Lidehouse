
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeParcel } from '/imports/api/parcels/methods.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { parcelColumns } from '/imports/api/parcels/tables.js';
import { Fraction } from 'fractional';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './community-memberships.html';

Template.Community_memberships_page.onCreated(function () {
});

Template.Community_memberships_page.helpers({
  reactiveTableDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Parcels.find({ communityId }).fetch();
    };
  },
  optionsFn() {
    return () => {
      return {
        columns: parcelColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
});

Template.Community_memberships_page.events({
  'click .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.parcel.insert',
      collection: Parcels,
      type: 'method',
      meteormethod: 'parcels.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.parcel.update',
      collection: Parcels,
      doc: Parcels.findOne(id),
      type: 'method-update',
      meteormethod: 'parcels.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeParcel, { _id: id }, 'remove parcel');
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

AutoForm.addModalHooks('af.parcel.insert');
AutoForm.addModalHooks('af.parcel.update');
AutoForm.addHooks('af.parcel.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
