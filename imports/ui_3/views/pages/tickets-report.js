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
  ticketStatusArray: [],
  startDate: '',
  endDate: '',
  reportedByCurrentUser: false,
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
    const ticketStatusArray = this.ticketStatusArray();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    const selector = { communityId, category: 'ticket' };
    selector.createdAt = {};
    if (ticketStatusArray.length > 0) selector['ticket.status'] = { $in: ticketStatusArray };
    if (startDate) selector.createdAt.$gte = new Date(this.startDate());
    if (endDate) selector.createdAt.$lte = new Date(this.endDate());
    if (reportedByCurrentUser) selector.userId = Meteor.userId();
    if (ticketText) {
      return Topics.find(selector, { sort: { createdAt: -1 } }).fetch().filter(t => t.title.toLowerCase().search(ticketText.toLowerCase()) >= 0
      || t.text.toLowerCase().search(ticketText.toLowerCase()) >= 0);
    }
    return Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
  },
  noFilters() {
    const ticketText = this.ticketText();
    const ticketStatusArray = this.ticketStatusArray();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    if (!ticketText && ticketStatusArray.length === 0 && !startDate && !endDate && !reportedByCurrentUser) return true;
    return false;
  },
  activeButton(data) {
    // TODO: Refactor
    const ticketStatusArray = this.ticketStatusArray();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    if ((typeof data === 'string' && ticketStatusArray.includes(data)) || (typeof data !== 'string' && reportedByCurrentUser)) return 'active';
    return '';
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
  headerTitles() {
    return Topics.headerTitles;
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
    const ticketStatusArray = instance.viewmodel.ticketStatusArray();
    if (ticketStatus === 'cancel') {
      instance.viewmodel.ticketText('');
      instance.viewmodel.ticketStatusArray([]);
      instance.viewmodel.startDate('');
      instance.viewmodel.endDate('');
      instance.viewmodel.reportedByCurrentUser(false);
    } else {
      const n = ticketStatusArray.includes(ticketStatus);
      if (n) {
        for (let i = 0; i <= ticketStatusArray.length; i += 1) {
          if (ticketStatusArray[i] === ticketStatus) {
            ticketStatusArray.splice(i, 1);
          }
        }
        instance.viewmodel.ticketStatusArray(ticketStatusArray);
        $(event.target).blur();
      } else {
        ticketStatusArray.push(ticketStatus);
        instance.viewmodel.ticketStatusArray(ticketStatusArray);
      }
    }
  },
  'click .js-reported-by-current-user'(event, instance) {
    const oldValue = instance.viewmodel.reportedByCurrentUser();
    instance.viewmodel.reportedByCurrentUser(!oldValue);
    if (oldValue) $(event.target).blur();
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.ticketText(event.target.value);
  },
});
