
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';

import './community-roleships.html';

Template.Community_roleships_page.onCreated(function () {
});

Template.Community_roleships_page.helpers({
  collection() {
    return Memberships;
  },
  schema() {
    return Memberships.schemaRole;
  },
  roleships() {
    const communityId = Session.get('activeCommunityId');
    return Memberships.find({ communityId });
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
  displayUsername(membership) {
    if (!membership.hasUser()) return '';
    return membership.user().fullName();
  },
  displayRole(roleship) {
    return roleship.role;
  },
});

Template.Community_roleships_page.events({
  'click .table-row'() {
    Session.set('selectedMemberId', this._id);
  },
  'click .js-new'(event, instance) {
    const communityId = Session.get('activeCommunityId');
    Meteor.call('memberships.insert', { communityId, role: 'guest' }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      const roleshipId = res;
      Session.set('selectedMemberId', roleshipId);
    });
  },
  'click .js-delete'() {
    Meteor.call('memberships.remove', { _id: this._id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedMemberId', undefined);
    });
  },
});
