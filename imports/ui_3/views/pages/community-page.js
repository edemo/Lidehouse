import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { ReactiveVar } from 'meteor/reactive-var';

import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Fraction } from 'fractional';

import { __ } from '/imports/localization/i18n.js';
import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';
import { leaderRoles, nonLeaderRoles, officerRoles } from '/imports/api/permissions/roles.js';
import { Communities } from '/imports/api/communities/communities.js';
import { remove as removeCommunity } from '/imports/api/communities/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeParcel } from '/imports/api/parcels/methods.js';
import { parcelColumns, highlightMyRow } from '/imports/api/parcels/tables.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import '/imports/api/memberships/methods.js';
import '/imports/api/users/users.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { afCommunityUpdateModal } from '/imports/ui_3/views/components/communities-edit.js';
import '../common/page-heading.js';
import '../components/action-buttons.html';
import '../components/contact-long.js';
import './community-page.html';

Template.Community_page.onCreated(function onCreated() {
  this.getCommunityId = () => FlowRouter.getParam('_cid') || Session.get('activeCommunityId');
  this.autorun(() =>
    this.subscribe('communities.byId', { _id: this.getCommunityId() })
  );
});

Template.Community_page.onRendered(function onRendered() {
  // Add slimscroll to element
  $('.full-height-scroll').slimscroll({
      height: '100%'
  });
});

Template.Community_page.onDestroyed(function onDestroyed() {
});

Template.Community_page.viewmodel({
  showAllParcels: false,
  reactive: false,
  communityId: null,
  selectedParcelId: null,
  selectedMemberId: null,
  onCreated() {
    this.communityId(this.templateInstance.getCommunityId());
  },
  onRendered() {
    const user = Meteor.user();
    const showAllParcelsDefault = Parcels.find().count() <= 25
      || (user && user.hasPermission('parcels.insert', this.templateInstance.getCommunityId()));
    this.showAllParcels(!!showAllParcelsDefault);
  },
  autorun() {
    // Autoform modals cannot see the viewmodel, so this must be copied to the Session
    Session.set('selectedCommunityId', this.communityId());
    Session.set('selectedParcelId', this.selectedParcelId());
  },
  community() {
    return Communities.findOne(this.communityId());
  },
  communities() {
    return Communities;
  },
  title() {
    const community = this.community();
    return `${__('Community page')} - ${community ? community.name : ''}`;
  },
  parcelDisplay() {
    const parcelId = this.selectedParcelId();
    const parcel = Parcels.findOne(parcelId);
    return parcel ? parcel.display() : __('unknown');
  },
/*  thingsToDisplayWithCounter() {
    const result = [];
    const communityId = Template.instance().getCommunityId();
    result.push({
      name: 'owner',
      count: Memberships.find({ communityId, active: true, role: 'owner' }).count(),
    });
    Parcels.typeValues.forEach(type =>
      result.push({
        name: type,
        count: Parcels.find({ communityId, type }).count(),
      })
    );
    return result;
  },*/
  leaders() {
    const communityId = this.communityId();
    return Memberships.find({ communityId, active: true, role: { $in: leaderRoles } });
  },
  nonLeaders() {
    const communityId = this.communityId();
    return Memberships.find({ communityId, active: true, role: { $in: nonLeaderRoles } });
  },
  officers() {
    const communityId = this.communityId();
    return Memberships.find({ communityId, active: true, role: { $in: officerRoles } });
  },
  ownerships() {
    const communityId = this.communityId();
    const parcelId = this.selectedParcelId();
    return Memberships.find({ communityId, active: true, role: 'owner', parcelId, approved: true });
  },
  unapprovedOwnerships() {
    const communityId = this.communityId();
    const parcelId = this.selectedParcelId();
    return Memberships.find({ communityId, role: 'owner', parcelId, approved: false });
  },
  archivedOwnerships() {
    const communityId = this.communityId();
    const parcelId = this.selectedParcelId();
    return Memberships.find({ communityId, role: 'owner', parcelId, active: false });
  },
  benefactorships() {
    const communityId = this.communityId();
    const parcelId = this.selectedParcelId();
    return Memberships.find({ communityId, active: true, role: 'benefactor', parcelId, approved: true });
  },
  unapprovedBenefactorships() {
    const communityId = this.communityId();
    const parcelId = this.selectedParcelId();
    return Memberships.find({ communityId, role: 'benefactor', parcelId, approved: false });
  },
  archivedBenefactorships() {
    const communityId = this.communityId();
    const parcelId = this.selectedParcelId();
    return Memberships.find({ communityId, role: 'benefactor', parcelId, active: false });
  },
  activeTabClass(index) {
    return index === 0 ? 'active' : '';
  },
  parcelTypesWithCount() {
    const communityId = this.communityId();
    const parcels = Parcels.find({ communityId }).fetch();
    const sumsResult = _(parcels).reduce(function (sums, parcel) {
      sums[parcel.type] = (sums[parcel.type] || 0) + 1;
      return sums;
    }, {});
    const result = [];
    Object.keys(sumsResult).forEach(k => {
      result.push({ type: k, count: sumsResult[k] });
    });
    return result;
  },
  parcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      let parcels = Tracker.nonreactive(() => Parcels.find({ communityId, approved: true }).fetch());
      if (!self.showAllParcels()) {
        const myParcelIds = Memberships.find({ communityId, personId: Meteor.userId() }).map(m => m.parcelId);
        parcels = parcels.filter(p => _.contains(myParcelIds, p._id));
      }
      return parcels;
    };
  },
  parcelsOptionsFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      const permissions = {
        view: Meteor.userOrNull().hasPermission('parcels.inCommunity', communityId),
        edit: Meteor.userOrNull().hasPermission('parcels.update', communityId),
        delete: Meteor.userOrNull().hasPermission('parcels.remove', communityId),
        assign: Meteor.userOrNull().hasPermission('memberships.inCommunity', communityId),
      };
      return {
        columns: parcelColumns(permissions),
        createdRow: highlightMyRow,
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
        pageLength: 25,
        // coming from the theme:
        dom: '<"html5buttons"B>lTfgitp',
        buttons: [
            { extend: 'copy' },
            { extend: 'csv' },
            { extend: 'excel', title: 'ExampleFile' },
            { extend: 'pdf', title: 'ExampleFile' },
            { extend: 'print',
                customize: function (win) {
                    $(win.document.body).addClass('white-bg');
                    $(win.document.body).css('font-size', '10px');

                    $(win.document.body).find('table')
                        .addClass('compact')
                        .css('font-size', 'inherit');
                },
            },
        ],
      };
    };
  },
  parcels() {
    const communityId = this.communityId();
    return Parcels.find({ communityId, approved: true });
  },
  unapprovedParcels() {
    const communityId = this.communityId();
    return Parcels.find({ communityId, approved: false });
  },
  unapprovedParcelsTableDataFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      return Parcels.find({ communityId, approved: false }).fetch();
    };
  },
  selectedMember() {
    const memberId = this.selectedMemberId();
    return Memberships.findOne(memberId);
  },
});

function onJoinParcelInsertSuccess(parcelId) {
  const communityId = FlowRouter.current().params._cid;
  const communityName = Communities.findOne(communityId).name;
  Memberships.methods.insert.call({
    person: { userId: Meteor.userId() },
    communityId,
    approved: false,  // any user can submit not-yet-approved memberships
    role: 'owner',
    parcelId,
    ownership: {
      share: new Fraction(1),
    },
  }, (err, res) => {
    if (err) displayError(err);
    else displayMessage('success', 'Join request submitted', communityName);
    Meteor.setTimeout(() => Modal.show('Modal', {
      title: __('Join request submitted', communityName),
      text: __('Join request notification'),
      btnOK: 'ok',
//      btnClose: 'cancel',
      onOK() { FlowRouter.go('App.home'); },
//      onClose() { removeMembership.call({ _id: res }); }, -- has no permission to do it, right now
    }), 3000);
  });
}

Template.Community_page.events({
  'click .js-member'(event, instance) {
//    event.preventDefault(); // the <a> functionality destroys the instance.data!!!
    const id = $(event.target).closest('tr').data('id');
    instance.viewmodel.selectedMemberId(id);
  },
  'click .js-assign'(event, instance) {
//    event.preventDefault(); // the <a> functionality destroys the instance.data!!!
    const id = $(event.target).closest('button').data('id');
    instance.viewmodel.selectedParcelId(id);
  },
  'click .js-invite'(event, instance) {
    const _id = $(event.target).data('id');
    const membership = Memberships.findOne(_id);
    Modal.confirmAndCall(Memberships.methods.linkUser, { _id }, {
      action: 'invite user',
      message: __('Connecting user', membership.Person().primaryEmail() || __('undefined')),
    });
  },
  // community events
  'click .community-section .js-edit'() {
    afCommunityUpdateModal();
  },
  'click .community-section .js-delete'() {
    const communityId = FlowRouter.current().params._cid;
    Modal.confirmAndCall(removeCommunity, { _id: communityId }, {
      message: 'It will disappear forever',
      action: 'delete community',
    });
  },
  'click .community-section .js-join'(event) {
    AccountsTemplates.forceLogin(() => {
      Modal.show('Autoform_edit', {
        title: 'pleaseSupplyParcelData',
        id: 'af.parcel.insert.unapproved',
        collection: Parcels,
//        omitFields: ['serial'],
        type: 'method',
        meteormethod: 'parcels.insert',
        template: 'bootstrap3-inline',
      });
      
/*    This can be used for immediate (no questions asked) joining - with a fixed ownership share
      const communityId = FlowRouter.current().params._cid;
      const maxSerial = Math.max.apply(Math, _.pluck(Parcels.find().fetch(), 'serial')) || 0;
      Meteor.call('parcels.insert',
        { communityId, approved: false, serial: maxSerial + 1, units: 300, type: 'flat' },
        (error, result) => { onJoinParcelInsertSuccess(result); },
      );
*/
    });
  },
  // roleship events
  'click .roles-section .js-new'() {
    Modal.show('Autoform_edit', {
      id: 'af.roleship.insert',
      collection: Memberships,
      fields: ['role', 'person', 'activeTime'],
      omitFields: ['person.idCard'],
      type: 'method',
      meteormethod: 'memberships.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .roles-section .js-edit'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.roleship.update',
      collection: Memberships,
      fields: ['activeTime'],
      doc: Memberships.findOne(id),
      type: 'method-update',
      meteormethod: 'memberships.update',
      singleMethodArgument: true,
      template: 'bootstrap3-inline',
    });
  },
  'click .roles-section .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.roleship.view',
      collection: Memberships,
      fields: ['role', 'person', 'activeTime'],
      omitFields: ['person.idCard', 'person.contact'],
      // omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'person.idCard', 'person.contact'], above 2 lines have the same efect, but look simpler
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click .roles-section .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(Memberships.methods.remove, { _id: id }, {
      action: 'delete roleship',
      message: 'You should rather archive it',
    });
  },
  // Owner/benefactor events
  'click #owners .js-import, #benefactors .js-import'(event, instance) {
    importCollectionFromFile(Memberships);
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
  // parcel events
  'click .parcels-section .js-import'(event, instance) {
    importCollectionFromFile(Parcels);
  },
  'click .parcels-section .js-show-all'(event, instance) {
    const oldVal = instance.viewmodel.showAllParcels();
    instance.viewmodel.showAllParcels(!oldVal);
  },
  'click .parcels-section .js-new'(event, instance) {
    Modal.show('Autoform_edit', {
      id: 'af.parcel.insert',
      collection: Parcels,
      type: 'method',
      meteormethod: 'parcels.insert',
      template: 'bootstrap3-inline',
    });
  },
  'click .parcels-section .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
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
  'click .parcels-section .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.show('Autoform_edit', {
      id: 'af.parcel.view',
      collection: Parcels,
      doc: Parcels.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click .parcels-section .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    Modal.confirmAndCall(removeParcel, { _id: id }, {
      action: 'delete parcel',
      message: 'You should rather archive it',
    });
  },
});

AutoForm.addModalHooks('af.roleship.insert');
AutoForm.addModalHooks('af.roleship.update');
AutoForm.addHooks('af.roleship.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('selectedCommunityId');
    return doc;
  },
});

AutoForm.addModalHooks('af.ownership.insert');
AutoForm.addModalHooks('af.ownership.update');
AutoForm.addHooks('af.ownership.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('selectedCommunityId');
    doc.parcelId = Session.get('selectedParcelId');
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
    doc.communityId = Session.get('selectedCommunityId');
    doc.parcelId = Session.get('selectedParcelId');
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

AutoForm.addModalHooks('af.parcel.insert');
AutoForm.addModalHooks('af.parcel.update');
AutoForm.addHooks('af.parcel.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('selectedCommunityId');
    return doc;
  },
});
AutoForm.addHooks('af.parcel.update', {
  formToModifier(modifier) {
    modifier.$set.approved = true;
    return modifier;
  },
});

AutoForm.addModalHooks('af.parcel.insert.unapproved');
AutoForm.addHooks('af.parcel.insert.unapproved', {
  formToDoc(doc) {
    doc.communityId = Session.get('selectedCommunityId');
    doc.approved = false;
    return doc;
  },
  onSuccess(formType, result) {
    onJoinParcelInsertSuccess(result);
  },
});
