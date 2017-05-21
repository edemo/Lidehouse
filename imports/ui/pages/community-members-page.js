
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';

import './community-members-page.html';

Template.Community_members_page.onCreated(function () {
});

Template.Community_members_page.helpers({
  members() {
    const communityId = Session.get('activeCommunity')._id;
    return Memberships.find({ communityId });
  },
  memberships() {
    return Memberships;
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
});

Template.Community_members_page.events({
  'click .table-row'() {
    Session.set('selectedMemberId', this._id);
  },
  'click .js-new-share'(event, instance) {
    const communityId = Session.get('activeCommunity')._id;
    Meteor.call('memberships.insert', { communityId }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      const membershipId = res;
      Session.set('selectedMemberId', membershipId);
    });
  },
  'click .js-delete-share'() {
    Meteor.call('memberships.remove', { _id: this._id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedMemberId', undefined);
    });
  },
  'click .js-invite-user'() {

  },
  'click .js-remove-user'() {
    Meteor.call('memberships.update', { $unset: { userId: '' } }, this._id, function(err, res) {
      if (err) {
        displayError(err);
      }
    });
  },
});
