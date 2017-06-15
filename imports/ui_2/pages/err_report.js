import './err_report.html';

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/tickets/tickets.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';

Template.Err_report.onCreated(function () {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Err_report.helpers({
  activeTicketsDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $not: 'closed' } }).fetch();
    }
    return getTableData;
  },
  closedTicketsDataFn() {
    function getTableData() {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': 'closed' }).fetch();
    }
    return getTableData;
  },
  activeTicketsOptionsFn() {
    function getOptions() {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    }
    return getOptions;
  },
  closedTicketsOptionsFn() {
    function getOptions() {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    }
    return getOptions;
  },
});

Template.Err_report.events({
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Meteor.call('topics.remove', { _id: id }, function(err, res) {
      if (err) {
        displayError(err);
      }
    });
  },
});
