/* global alert */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
// import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { displayError } from '/imports/ui/lib/errors.js';

import { Delegations } from '/imports/api/delegations/delegations.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
// import { insert as insertDelegation } from '../../api/delegations/methods.js';
import { delegationFromMeColumns, delegationToMeColumns } from '/imports/api/delegations/tables.js';

import './user-delegations.html';

const schemaForDelegationsFromMe = new SimpleSchema({
  objectId: { type: String,
    autoform: {
      options() {
        return Memberships.find({ userId: Meteor.userId(), role: 'owner' }).map(function option(m) {
          return { label: m.parcel(), value: m._id };
        });
      },
    },
  },
  targetUserId: { type: String,
    autoform: {
      options() {
        return Meteor.users.find({}).map(function option(u) {
          return { label: u.fullName(), value: u._id };
        });
      },
    },
  },
});

Meteor.startup(function attach() {
  schemaForDelegationsFromMe.i18n('delegations');
});

// ----- TEMPLATE START -----

Template.User_delegations.onCreated(function onCreated() {
  this.subscribe('delegations.ofUser');
});

Template.User_delegations.helpers({
  collection() {
    return Delegations;
  },
  hasSelection() {
    return !!Session.get('selectedDelegationId');
  },
  selectedDoc() {
    return Delegations.findOne(Session.get('selectedDelegationId'));
  },
  formType() {
    if (Session.get('selectedDelegationId')) return 'method-update';
    return 'disabled';
  },
  schemaForDelegationsFromMe() {
    return schemaForDelegationsFromMe;
  },
  delegationsFromMeDataFn() {
    function getTableData() {
      return Delegations.find({ sourceUserId: Meteor.userId(), scope: 'membership' }).fetch();
    }
    return getTableData;
  },
  delegationsFromMeOptionsFn() {
    function getOptions() {
      return {
        columns: delegationFromMeColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    }
    return getOptions;
  },
  delegationsToMeDataFn() {
    function getTableData() {
      return Delegations.find({ targetUserId: Meteor.userId(), scope: 'membership' }).fetch();
    }
    return getTableData;
  },
  delegationsToMeOptionsFn() {
    function getOptions() {
      return {
        columns: delegationToMeColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    }
    return getOptions;
  },

});

Template.User_delegations.events({
  'click .js-new-fromme'(event, instance) {
    Meteor.call('delegations.insert', { sourceUserId: Meteor.userId(), scope: 'membership' }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      Session.set('selectedDelegationId', res);
    });
  },
  'click .js-new-tome'(event, instance) {
    Meteor.call('delegations.insert', { targetUserId: Meteor.userId(), scope: 'membership' }, function(err, res) {
      if (err) {
        displayError(err);
        return;
      }
      Session.set('selectedDelegationId', res);
    });
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    Session.set('selectedDelegationId', id);
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Meteor.call('delegations.remove', { _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
      Session.set('selectedDelegationId', undefined);
    });
  },
});
