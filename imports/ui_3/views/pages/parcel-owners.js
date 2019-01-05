
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { __ } from '/imports/localization/i18n.js';

import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '../common/page-heading.js';
import '../components/action-buttons.html';
import './parcel-owners.html';

Template.Parcel_owners_page.onCreated(function () {
});

Template.Parcel_owners_page.onRendered(function () {
});

Template.Parcel_owners_page.helpers({
  pageCrumbs() {
    const parcelId = FlowRouter.getParam('_pid');
    const communityId = Parcels.findOne(parcelId).communityId;
    return [{
      title: __('Community page'),
      url: FlowRouter.path('Community.page', { _cid: communityId }),
    }];
  },
  title() {
    return `${__('parcel')} ${__("'s owners")}`;
  },
  smallTitle() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    return parcel ? `${parcel.display()} ${__("'s owners")}` : __('unknown');
  },
  communityId() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return communityId;
  },
  ownerships() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, active: true, role: 'owner', parcelId, approved: true });
  },
  unapprovedOwnerships() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, role: 'owner', parcelId, approved: false });
  },
  archivedOwnerships() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, role: 'owner', parcelId, active: false });
  },
  benefactorships() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, active: true, role: 'benefactor', parcelId, approved: true });
  },
  unapprovedBenefactorships() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, role: 'benefactor', parcelId, approved: false });
  },
  archivedBenefactorships() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, role: 'benefactor', parcelId, active: false });
  },
  members() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    const communityId = parcel ? parcel.communityId : undefined;
    return Memberships.find({ communityId, active: true, role: { $in: ['owner', 'benefactor'] }, parcelId, approved: true });
  },
  activeTabClass(index) {
    return index === 0 ? 'active' : '';
  },
  display() {
    const parcelId = FlowRouter.getParam('_pid');
    const parcel = Parcels.findOne(parcelId);
    return parcel.display();
  },
  hasUnapprovedMemberships() {
    const parcelId = FlowRouter.getParam('_pid');
    return Memberships.find({ parcelId, role: 'owner', approved: false }).fetch().length > 0;
  },
  unapprovedTableDataFn() {
    return () => {
      const parcelId = FlowRouter.getParam('_pid');
      return Memberships.find({ parcelId, role: 'owner', approved: false }).fetch();
    };
  },
});

Template.Parcel_owners_page.events({
  'click .js-import'(event, instance) {
    importCollectionFromFile(Memberships);
  },
  'click .js-invite'(event, instance) {
    const _id = $(event.target).data('id');
    const membership = Memberships.findOne(_id);
    if (!membership.person || !membership.person.contact || !membership.person.contact.email) {
      displayMessage('warning', __('No contact email set for this membership'));
      return;
    }
    Modal.confirmAndCall(Memberships.methods.linkUser, { _id }, {
      action: 'invite user',
      message: __('Connecting user', membership.person.contact.email),
    });
  },
  'click #owners .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.ownership.insert',
      collection: Memberships,
      fields: ['person', 'ownership', 'activeTime'],
      omitFields: ['person.userId'],
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
      fields: ['person', 'ownership', 'activeTime'],
      omitFields: ['person.userId'],
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
      fields: ['person', 'ownership', 'activeTime'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #owners .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(Memberships.methods.remove, { _id: id }, {
      action: 'delete ownership',
      message: 'You should rather archive it',
    });
  },
  'click #benefactors .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.benefactorship.insert',
      collection: Memberships,
      fields: ['person', 'benefactorship', 'activeTime'],
      omitFields: ['person.userId'],
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
      fields: ['person', 'benefactorship', 'activeTime'],
      omitFields: ['person.userId'],
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
      fields: ['person', 'benefactorship', 'activeTime'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click #benefactors .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(Memberships.methods.remove, { _id: id }, {
      action: 'delete benefactorship',
      message: 'You should rather archive it',
    });
  },
});

AutoForm.addModalHooks('af.ownership.insert');
AutoForm.addModalHooks('af.ownership.update');
AutoForm.addHooks('af.ownership.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.parcelId = FlowRouter.getParam('_pid');
    doc.approved = true;
    doc.role = 'owner';
    return doc;
  },
});
AutoForm.addHooks('af.ownership.update', {
  formToModifier(modifier) {
    modifier.$set.approved = true;
    return modifier;
  },
});
AutoForm.addModalHooks('af.benefactorship.insert');
AutoForm.addModalHooks('af.benefactorship.update');
AutoForm.addHooks('af.benefactorship.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.parcelId = FlowRouter.getParam('_pid');
    doc.approved = true;
    doc.role = 'benefactor';
    return doc;
  },
});
AutoForm.addHooks('af.benefactorship.update', {
  formToModifier(modifier) {
    modifier.$set.approved = true;
    return modifier;
  },
});
