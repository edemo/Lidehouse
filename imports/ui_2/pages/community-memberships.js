
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeParcel } from '/imports/api/parcels/methods.js';
import { parcelColumns } from '/imports/api/parcels/tables.js';
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
    Modal.confirmAndCall(removeParcel, { _id: id }, {
      action: 'delete parcel',
    });
  },
});

AutoForm.addModalHooks('af.parcel.insert');
AutoForm.addModalHooks('af.parcel.update');
AutoForm.addHooks('af.parcel.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});
