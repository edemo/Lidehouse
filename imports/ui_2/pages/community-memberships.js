
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { parcelColumns } from '/imports/api/parcels/tables.js';
import './community-memberships.html';

Template.Community_memberships_page.onCreated(function () {
});

Template.Community_memberships_page.helpers({
  parcels() {
    return Parcels;
  },
  memberships() {
    return Memberships;
  },
  ownershipSchema() {
    return Memberships.schemaForOwnership;
  },
/*  owners() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId, role: 'owner' });
  },*/
  selectedDoc() {
    return Parcels.findOne(Session.get('selectedParcelId'));
  },
  isSelected() {
    return Session.equals('selectedParcelId', this._id);
  },
  formType() {
    if (Session.get('selectedParcelId')) return 'update';
    return 'disabled';
  },
  hasSelection() {
    return !!Session.get('selectedParcelId');
  },
/*  displayShare(share, totalshares) {
    if (!share) return '';
    return `${share}/${totalshares}`;
  },
  displayUsername(membership) {
    if (!membership.hasUser()) return '';
    return membership.user().safeUsername();
  },
*/
  reactiveTableDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Parcels.find({ communityId }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: parcelColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Community_memberships_page.events({
  'click .js-new'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    Parcels.insert({ communityId }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      const parcelId = res;
      Session.set('selectedParcelId', parcelId);
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedParcelId', id);
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Parcels.remove({ _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedParcelId', undefined);
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
