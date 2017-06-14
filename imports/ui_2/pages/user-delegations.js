/* global alert */

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
// import { AutoForm } from 'meteor/aldeed:autoform';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { displayError } from '/imports/ui/lib/errors.js';

import { Delegations } from '/imports/api/delegations/delegations.js';
// import { insert as insertDelegation } from '../../api/delegations/methods.js';
import { delegationColumns } from '/imports/api/delegations/tables.js';

import './user-delegations.html';

Template.User_delegations.onCreated(function onCreated() {
  this.subscribe('delegations.ofUser');
});

Template.User_delegations.helpers({
  delegationScopes() {
    return Delegations.scopes;
  },
  reactiveDelegationsDataFn(scope) {
    function getTableData() {
      return Delegations.find({ sourceUserId: Meteor.userId(), scope }).fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: delegationColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.User_delegations.events({
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    // TODO: open editor
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Delegations.remove({ _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
    });
  },
});
