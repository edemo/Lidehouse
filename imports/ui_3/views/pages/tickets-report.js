import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { ReactiveDict } from 'meteor/reactive-dict';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

import { Topics } from '/imports/api/topics/topics.js';
import { ticketsSchema } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { afTicketInsertModal, afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal }
  from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './tickets-report.html';

Template.Tickets_report.onCreated(function () {
  //this.ticketStatus = new ReactiveDict();
  //this.ticketStatus.set('ticketStatus', false);
});

Template.Tickets_report.viewmodel({
  ticketText: '',
  ticketStatus: '',
  startDate: '',
  endDate: '',
  statusColor(value) {
    return Topics.statusColors[value];
  },
  urgencyColor(value) {
    return Topics.urgencyColors[value];
  },
  ticketsSchema() {
    return ticketsSchema;
  },
  tickets() {
    const communityId = Session.get('activeCommunityId');
    const ticketText = this.ticketText();
    const ticketStatus = this.ticketStatus();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const selector = { communityId, category: 'ticket' };
    selector.createdAt = {};
    if (ticketStatus) selector['ticket.status'] = ticketStatus;
    if (startDate) selector.createdAt.$gte = new Date(this.startDate());
    if (endDate) selector.createdAt.$lte = new Date(this.endDate());
    if (ticketText) {
      return Topics.find(selector, { sort: { createdAt: -1 } }).fetch().filter(t => t.title.toLowerCase().search(ticketText.toLowerCase()) >= 0
      || t.text.toLowerCase().search(ticketText.toLowerCase()) >= 0);
    }
    return Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
  },
  noFilters() {
    const ticketText = this.ticketText();
    const ticketStatus = this.ticketStatus();
    const startDate = this.startDate();
    const endDate = this.endDate();
    if (!ticketText && !ticketStatus && !startDate && !endDate) return true;
    return false;
  },
  recentTickets() {
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'ticket',
      $or: [{ 'ticket.status': { $ne: 'closed' } }, { createdAt: { $gt: moment().subtract(1, 'week').toDate() } }],
    }, { sort: { createdAt: -1 } });
  },
  activeTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $ne: 'closed' } }).fetch();
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
  statusValues() {
    return Topics.statusValues;
  },
});

Template.Tickets_report.events({
  'click .js-new'() {
    afTicketInsertModal();
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    afTicketUpdateModal(id);
  },
  'click .js-status'(event) {
    const id = $(event.target).data('id');
    afTicketStatusChangeModal(id);
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    deleteTicketConfirmAndCallModal(id);
  },
  'click .js-status-filter'(event, instance) {
    const ticketStatus = $(event.target).data('value');
    if (ticketStatus === 'cancel') {
      instance.viewmodel.ticketText('');
      instance.viewmodel.ticketStatus('');
      instance.viewmodel.startDate('');
      instance.viewmodel.endDate('');
      $('.js-status-filter').removeClass('js-status-border');
    } else {
      instance.viewmodel.ticketStatus(ticketStatus);
      $('.js-status-filter').removeClass('js-status-border');
      $(event.target).addClass('js-status-border');
    }
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.ticketText(event.target.value);
  },
});
