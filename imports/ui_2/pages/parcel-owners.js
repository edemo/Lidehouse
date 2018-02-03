
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeMembership } from '/imports/api/memberships/methods.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { onSuccess } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { ownershipColumns, benefactorshipColumns } from '/imports/api/memberships/tables.js';
import { Fraction } from 'fractional';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '../modals/confirmation.js';
import '../modals/autoform-edit.js';
import './parcel-owners.html';

Template.Parcel_owners_page.onCreated(function () {
});

Template.Parcel_owners_page.helpers({
  display() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    return parcel.display();
  },
  ownersTableDataFn() {
    return () => {
      const parcelId = FlowRouter.getParam('_pid');
      return Memberships.find({ role: 'owner', parcelId }).fetch();
    };
  },
  ownersOptionsFn() {
    return () => {
      const parcelId = FlowRouter.getParam('_pid');
      const communityId = Parcels.findOne(parcelId).communityId;
      const permissions = {
        view: Meteor.userOrNull().hasPermission('memberships.inCommunity', communityId),
        edit: Meteor.userOrNull().hasPermission('ownerships.update', communityId),
        delete: Meteor.userOrNull().hasPermission('ownerships.remove', communityId),
      };
      return {
        columns: ownershipColumns(permissions),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
  benefactorsTableDataFn() {
    return () => {
      const parcelId = FlowRouter.getParam('_pid');
      return Memberships.find({ role: 'benefactor', parcelId }).fetch();
    };
  },
  benefactorsOptionsFn() {
    return () => {
      const parcelId = FlowRouter.getParam('_pid');
      const communityId = Parcels.findOne(parcelId).communityId;
      const permissions = {
        view: Meteor.userOrNull().hasPermission('memberships.inCommunity', communityId),
        edit: Meteor.userOrNull().hasPermission('benefactorships.update', communityId),
        delete: Meteor.userOrNull().hasPermission('benefactorships.remove', communityId),
      };
      return {
        columns: benefactorshipColumns(permissions),
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
  'click #owners .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.ownership.insert',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role', 'benefactorship'],
      type: 'method',
      meteormethod: 'memberships.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #owners .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.ownership.update',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role', 'benefactorship'],
      doc: Memberships.findOne(id),
      type: 'method-update',
      meteormethod: 'memberships.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #owners .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.ownership.view',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role', 'benefactorship'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #owners .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeMembership, { _id: id }, {
      action: 'delete ownership',
    });
  },
  'click #benefactors .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.benefactorship.insert',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role', 'ownership'],
      type: 'method',
      meteormethod: 'memberships.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click #benefactors .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.benefactorship.update',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role', 'ownership'],
      doc: Memberships.findOne(id),
      type: 'method-update',
      meteormethod: 'memberships.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click #benefactors .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.benefactorship.view',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'role', 'ownership'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #benefactors .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeMembership, { _id: id }, {
      action: 'delete benefactorship',
    });
  },
});

AutoForm.addModalHooks('af.ownership.insert');
AutoForm.addModalHooks('af.ownership.update');
AutoForm.addHooks('af.ownership.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.parcelId = FlowRouter.getParam('_pid');
    doc.role = 'owner';
    return doc;
  },
});
AutoForm.addModalHooks('af.benefactorship.insert');
AutoForm.addModalHooks('af.benefactorship.update');
AutoForm.addHooks('af.benefactorship.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.parcelId = FlowRouter.getParam('_pid');
    doc.role = 'benefactor';
    return doc;
  },
});
