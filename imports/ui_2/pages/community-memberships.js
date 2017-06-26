
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { parcelColumns } from '/imports/api/parcels/tables.js';
import { Fraction } from 'fractional';
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
  selectedDoc() {
    return Parcels.findOne(Session.get('selectedParcelId'));
  },
  isSelected() {
    return Session.equals('selectedParcelId', this._id);
  },
  formType() {
    if (Session.get('selectedParcelId')) return 'method-update';
    return 'disabled';
  },
  hasSelection() {
    return !!Session.get('selectedParcelId');
  },
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
    Meteor.call('parcels.insert', { communityId }, function(err, res) {
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
    Meteor.call('parcels.remove', { _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedParcelId', undefined);
    });
  },
  'click .js-assign'(event) {
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
});
