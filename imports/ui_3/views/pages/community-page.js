import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Communities } from '/imports/api/communities/communities.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Accounts } from 'meteor/accounts-base';
import { __ } from '/imports/localization/i18n.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { remove as removeParcel } from '/imports/api/parcels/methods.js';
import { parcelColumns } from '/imports/api/parcels/tables.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { roleshipColumns } from '/imports/api/memberships/tables.js';
import { update as updateMembership, remove as removeMembership } from '/imports/api/memberships/methods.js';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import '/imports/api/users/users.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import '/imports/ui_2/modals/confirmation.js';
import '/imports/ui_2/modals/autoform-edit.js';
import { afCommunityUpdateModal } from '/imports/ui_2/pages/communities-edit.js';
import '../common/page-heading.js';
import '../components/action-buttons.html';
import './community-page.html';

Template.Community_page.onCreated(function() {
  this.getCommunityId = () => FlowRouter.getParam('_cid') || Session.get('activeCommunityId');

  this.autorun(() => {
    const communityId = this.getCommunityId();
    this.subscribe('communities.byId', { _id: communityId });
    this.subscribe('parcels.inCommunity', { communityId });
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
    return community.name + ' ' + __('data page');
  },
  community() {
    const communityId = Template.instance().getCommunityId();
    const community = Communities.findOne({ _id: communityId });
    return community;
  },
  communities() {
    return Communities;
  },
  autoformType(communityId) {
    return Meteor.userOrNull().hasPermission('communities.update', communityId) ? 'method-update' : 'readonly';
  },
/*  thingsToDisplayWithCounter() {
    const result = [];
    const communityId = Template.instance().getCommunityId();
    result.push({
      name: 'owner',
      count: Memberships.find({ communityId, role: 'owner' }).count(),
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
    return Memberships.find({ communityId, role: { $in: ['admin', 'manager'] } }).fetch();
  },
  nonLeaders() {
    const communityId = Template.instance().getCommunityId();
    return Memberships.find({ communityId, role: { $not: { $in: ['admin', 'manager', 'owner', 'benefactor', 'guest', 'delegate'] } } }).fetch();
  },
  rolesTableDataFn() {
    const templateInstance = Template.instance();
    return () => {
      const communityId = templateInstance.getCommunityId();
      return Memberships.find({ communityId, role: { $not: { $in: ['owner', 'benefactor', 'guest', 'delegate'] } } }).fetch();
    };
  },
  rolesOptionsFn() {
    const templateInstance = Template.instance();
    return () => {
      const communityId = templateInstance.getCommunityId();
      const permissions = {
        view: Meteor.userOrNull().hasPermission('memberships.inCommunity', communityId),
        edit: Meteor.userOrNull().hasPermission('roleships.update', communityId),
        delete: Meteor.userOrNull().hasPermission('roleships.remove', communityId),
      };
      return {
        columns: roleshipColumns(permissions),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
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
  hasUnapprovedParcels() {
    const communityId = Template.instance().getCommunityId();
    return Parcels.find({ communityId, approved: false }).fetch().length > 0;
  },
  unapprovedParcelsTableDataFn() {
    const templateInstance = Template.instance();
    return () => {
      const communityId = templateInstance.getCommunityId();
      return Parcels.find({ communityId, approved: false }).fetch();
    };
  },
});

Template.Community_page.events({
  // community events
  'click .community-section .js-edit'() {
    afCommunityUpdateModal();
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
  'click .parcels-section .js-view'(event) {
    const id = $(event.target).data('id');
    Modal.show('Autoform_edit', {
      id: 'af.parcel.view',
      collection: Parcels,
      doc: Parcels.findOne(id),
      type: 'readonly',
      template: 'bootstrap3-inline',
    });
  },
  'click .parcels-section .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeParcel, { _id: id }, {
      action: 'delete parcel',
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
//    console.log(`modifier: ${JSON.stringify(modifier)}`);
    modifier.$set.approved = true;
    return modifier;
  },
});

/*   sortables() {
     $( "ul.droptrue" ).sortable({
      connectWith: ".js-sort-list"
     });
	
    // $( "#sortable1" ).disableSelection();
	
*/

/*/ https://stackoverflow.com/questions/17030845/how-does-one-actually-use-markdown-with-meteor

Template.Housing.rendered = function() {
  setPageTitle("*your* ~~markdown~~ _data_");
};

Template.Housing.markdown_data = function() {return Session.get("markdown_data")});

function setPageTitle(titleName) {
  var prefix = "## Welcome";

  if ($('section').hasClass('single')) {
	Session.set("markdown_data",prefix + titleName);
  }
}
*/