import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Fraction } from 'fractional';

import { __ } from '/imports/localization/i18n.js';
import { leaderRoles, nonLeaderRoles, officerRoles } from '/imports/api/permissions/roles.js';
import { Communities } from '/imports/api/communities/communities.js';
import { remove as removeCommunity } from '/imports/api/communities/methods.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeParcel } from '/imports/api/parcels/methods.js';
import { parcelColumns, highlightMyRow } from '/imports/api/parcels/tables.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { update as updateMembership, remove as removeMembership, insertUnapproved as insertMembershipUnapproved } from '/imports/api/memberships/methods.js';
import '/imports/api/users/users.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import { afCommunityUpdateModal } from '/imports/ui_3/views/components/communities-edit.js';
import '../common/page-heading.js';
import '../components/action-buttons.html';
import './community-page.html';

import { displayError, displayMessage } from '/imports/ui_3/lib/errors.js';

Template.Community_page.onCreated(function() {
  this.getCommunityId = () => FlowRouter.getParam('_cid') || Session.get('activeCommunityId');

  this.autorun(() => {
    const communityId = this.getCommunityId();
    this.subscribe('communities.byId', { _id: communityId });
  });
});

Template.Community_page.onRendered(function() {
    // Add slimscroll to element
    $('.full-height-scroll').slimscroll({
        height: '100%'
    });
});

Template.Community_page.helpers({
  title() {
    const communityId = Template.instance().getCommunityId();
    const community = Communities.findOne({ _id: communityId });
    return `${__('Community page')} - ${community ? community.name : ''}`;
  },
  communityId() {
    return Template.instance().getCommunityId();
  },
  community() {
    const communityId = Template.instance().getCommunityId();
    const community = Communities.findOne(communityId);
    return community;
  },
  communities() {
    return Communities;
  },
  autoformType(communityId) {
    return Meteor.userOrNull().hasPermission('communities.update', communityId) ? 'method-update' : 'readonly';
  },
  parcelTypesWithCount() {
    const communityId = Template.instance().getCommunityId();
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
    const communityId = Template.instance().getCommunityId();
    return Memberships.find({ communityId, active: true, role: { $in: leaderRoles } });
  },
  nonLeaders() {
    const communityId = Template.instance().getCommunityId();
    return Memberships.find({ communityId, active: true, role: { $in: nonLeaderRoles } });
  },
  officers() {
    const communityId = Template.instance().getCommunityId();
    return Memberships.find({ communityId, active: true, role: { $in: officerRoles } });
  },
  parcelsTableDataFn() {
    const templateInstance = Template.instance();
    return () => {
      const communityId = templateInstance.getCommunityId();
      return Parcels.find({ communityId, approved: true }).fetch();
    };
  },
  parcelsOptionsFn() {
    const templateInstance = Template.instance();
    return () => {
      const communityId = templateInstance.getCommunityId();
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
    const communityId = Template.instance().getCommunityId();
    return Parcels.find({ communityId, approved: true });
  },
  unapprovedParcels() {
    const communityId = Template.instance().getCommunityId();
    return Parcels.find({ communityId, approved: false });
  },
  unapprovedParcelsTableDataFn() {
    const templateInstance = Template.instance();
    return () => {
      const communityId = templateInstance.getCommunityId();
      return Parcels.find({ communityId, approved: false }).fetch();
    };
  },
});

function onJoinParcelInsertSuccess(parcelId) {
  // const parcelId = Parcels.find({ communityId }, { sort: { createdAt: -1 } }).fetch()[0]._id;
  const communityId = FlowRouter.current().params._cid;
  const communityName = Communities.findOne(communityId).name;
  insertMembershipUnapproved.call({
    person: { userId: Meteor.userId() },
    communityId,
    approved: false,
    role: 'owner',
    parcelId,
    ownership: {
      share: new Fraction(1),
    },
  }, (err, res) => {
    if (err) displayError(err);
    else displayMessage('success', 'Joined community', communityName);
    FlowRouter.go('App.home');
  });
}

Template.Community_page.events({
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
  // roleship events
  'click .roles-section .js-new'() {
    Modal.show('Autoform_edit', {
      id: 'af.roleship.insert',
      collection: Memberships,
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'person.idCard'],
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
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'person.idCard'],
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
      omitFields: ['communityId', 'parcelId', 'ownership', 'benefactorship', 'person.idCard'],
      doc: Memberships.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click .roles-section .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeMembership, { _id: id }, {
      action: 'delete roleship',
    });
  },
  // parcel events
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
    });
  },
  'click .js-join'(event) {
    AccountsTemplates.forceLogin(() => {
      Modal.show('Autoform_edit', {
        title: 'pleaseSupplyParcelData',
        id: 'af.parcel.insert.unapproved',
        collection: Parcels,
        omitFields: ['serial'],
        type: 'method',
        meteormethod: 'parcels.insert.unapproved',
        template: 'bootstrap3-inline',
      });
      
/*    This can be used for immediate (no questions asked) joining - with a fixed ownership share
      const communityId = FlowRouter.current().params._cid;
      const maxSerial = Math.max.apply(Math, _.pluck(Parcels.find().fetch(), 'serial')) || 0;
      Meteor.call('parcels.insert.unapproved',
        { communityId, approved: false, serial: maxSerial + 1, units: 300, type: 'flat' },
        (error, result) => { onJoinParcelInsertSuccess(result); },
      );
*/
    });
  },
});

AutoForm.addModalHooks('af.roleship.insert');
AutoForm.addModalHooks('af.roleship.update');
AutoForm.addHooks('af.roleship.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
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
AutoForm.addHooks('af.parcel.update', {
  formToModifier(modifier) {
    modifier.$set.approved = true;
    return modifier;
  },
});

AutoForm.addModalHooks('af.parcel.insert.unapproved');
AutoForm.addHooks('af.parcel.insert.unapproved', {
  formToDoc(doc) {
    const communityId = FlowRouter.current().params._cid;
    doc.communityId = communityId;
    doc.approved = false;
    return doc;
  },
  onSuccess(formType, result) {
    onJoinParcelInsertSuccess(result);
  },
});
