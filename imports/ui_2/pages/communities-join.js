import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { communityColumns } from '/imports/api/communities/tables.js';
import { Communities } from '/imports/api/communities/communities.js';
import { insert as insertMembership } from '../../api/memberships/methods.js';
import './communities-join.html';

Template.Communities_join.onCreated(function onCreated() {
  this.subscribe('communities.listing');
});

Template.Communities_join.helpers({
  communities() {
    return Communities.find({});
  },
  reactiveTableDataFn() {
    function getTableData() {
      return Communities.find().fetch();
    }
    return getTableData;
  },
  optionsFn() {
    function getOptions() {
      return {
        columns: communityColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Communities_join.events({
  'click .js-join'(event) {
    const communityId = $(event.target).data('id');
    const communityName = Communities.findOne(communityId).name;
    insertMembership.call({ userId: Meteor.userId(), communityId, role: 'guest' }, (err, res) => {
      if (err) {
        FlowRouter.go('App.home');
        displayError(err);
      }
      displayMessage('success', 'Joined community', communityName);
    });
  },
});
