import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/tickets/tickets.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { remove as removeTopic } from '/imports/api/topics/methods.js';
import '../modals/confirmation.js';

import './tickets-report.html';

Template.Tickets_report.onCreated(function () {
  this.autorun(() => {
    this.subscribe('topics.inCommunity', { communityId: Session.get('activeCommunityId') });
  });
});

Template.Tickets_report.helpers({
  ticketsCollection() {
    return Topics;
  },
  ticketsSchema() {
    return Topics.simpleSchema();

//    new SimpleSchema({ });
  },
  activeTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $not: 'closed' } }).fetch();
    };
  },
  closedTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': 'closed' }).fetch();
    };
  },
  activeTicketsOptionsFn() {
    return () => {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  },
  closedTicketsOptionsFn() {
    return () => {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },
});

Template.Tickets_report.events({
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    Modal.confirmAndCall(removeTopic, { id }, 'remove topic');
  },
});
