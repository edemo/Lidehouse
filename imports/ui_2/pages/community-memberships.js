
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { ownershipColumns } from '/imports/api/memberships/tables.js';
import './community-memberships.html';

Template.Community_memberships_page.onCreated(function () {
});

Template.Community_memberships_page.helpers({
  collection() {
    return Memberships;
  },
  schema() {
    return Memberships.schemaForOwnership;
  },
  owners() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId, role: 'owner' });
  },
  selectedDoc() {
    return Memberships.findOne(Session.get('selectedMemberId'));
  },
  isSelected() {
    return Session.equals('selectedMemberId', this._id);
  },
  formType() {
    if (Session.get('selectedMemberId')) return 'method-update';
    return 'disabled';
  },
  hasSelection() {
    return !!Session.get('selectedMemberId');
  },
  displayShare(share, totalshares) {
    if (!share) return '';
    return `${share}/${totalshares}`;
  },
  displayUsername(membership) {
    if (!membership.hasUser()) return '';
    return membership.user().safeUsername();
  },

  // ephemer:reactive-meteor-datatables (client-side filtering)
  reactiveTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Memberships.find({ communityId, role: 'owner' }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: ownershipColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },

  // aldeed:tabular (server-side filtering)
  selector() {
    return { communityId: Session.get('activeCommunityId'), role: 'owner' };
  },
});

Template.Community_memberships_page.events({
  'click .js-new'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    Meteor.call('memberships.insert', { communityId, role: 'owner' }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      const membershipId = res;
      Session.set('selectedMemberId', membershipId);
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedMemberId', id);
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Meteor.call('memberships.remove', { _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedMemberId', undefined);
    });
  },
  'click .js-invite-user'() {

  },
  'click .js-remove-user'() {
    Meteor.call('memberships.update', { _id: this._id, modifier: { $unset: { userId: '' } } }, function(err, res) {
      if (err) {
        displayError(err);
      }
    });
  },
});
