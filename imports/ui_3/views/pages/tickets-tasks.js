import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { ReactiveDict } from 'meteor/reactive-dict';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';

import { Topics } from '/imports/api/topics/topics.js';
import { TicketStatusNames, TicketStatusColors, TicketTypes } from '/imports/api/topics/tickets/ticket-status.js';
import { ticketsSchema } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { afTicketInsertModal, afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal }
  from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './tickets-tasks.html';

Template.Tickets_tasks.onCreated(function onCreated() {
  this.getCommunityId = () => FlowRouter.getParam('_cid') || Session.get('activeCommunityId');
  this.autorun(() =>
    this.subscribe('communities.byId', { _id: this.getCommunityId() })
  );
});

Template.Tickets_tasks.viewmodel({
  ticketText: '',
  ticketStatusArray: [],
  ticketTypeArray: Object.keys(TicketTypes),
  startDate: '',
  endDate: '',
  reportedByCurrentUser: false,
  communityId: null,
  ticketTypeSelector: '',
  onCreated() {
    this.communityId(this.templateInstance.getCommunityId());
  },
  /* option() {
    if (this.ticketTypeSelector() === '') return false;
    if (this.ticketTypeSelector() === 'tasks') return true;
    if (this.ticketTypeSelector() === 'tickets') return false;
  },*/
  statusColor(value) {
    return TicketStatusColors[value];
  },
  /* taskStatusColor(value) {
    return Topics.taskStatusColors[value];
  },*/
  urgencyColor(value) {
    return Topics.urgencyColors[value];
  },
  ticketsSchema() {
    return ticketsSchema;
  }, /*
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
  },*/
  noFilters() {
    const ticketText = this.ticketText();
    const ticketStatusArray = this.ticketStatusArray();
    const ticketTypeArray = this.ticketTypeArray();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    if (!ticketText && ticketStatusArray.length === 0 && ticketTypeArray.length === 0 && !startDate && !endDate && !reportedByCurrentUser) return true;
    return false;
  },
  activeStatusButton(data) {
    // TODO: Refactor
    const ticketStatusArray = this.ticketStatusArray();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    if ((typeof data === 'string' && ticketStatusArray.includes(data)) || (typeof data !== 'string' && reportedByCurrentUser)) return 'active';
    return '';
  },
  activeTypeButton(data) {
    // TODO: Refactor
    const ticketTypeArray = this.ticketTypeArray();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    if ((typeof data === 'string' && ticketTypeArray.includes(data)) || (typeof data !== 'string' && reportedByCurrentUser)) return 'active';
    return '';
  },
  recentTickets() {
    const communityId = Session.get('activeCommunityId');
    const recentTickets = [];
    const allTickets = Topics.find({ communityId, category: 'ticket',
      $or: [{ 'ticket.status': { $ne: 'closed' } }, { createdAt: { $gt: moment().subtract(1, 'week').toDate() } }],
    }, { sort: { createdAt: -1 } }).fetch();
    for (let i = 0; i <= 1; i += 1) {
      recentTickets.push(allTickets[i]);
    }
    return recentTickets;
  },
  ticketsDataFn() {
    return () => {
      /* const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': { $ne: 'closed' } }).fetch();
    };*/
      const communityId = Session.get('activeCommunityId');
      const ticketText = this.ticketText();
      const ticketStatusArray = this.ticketStatusArray();
      const ticketTypeArray = this.ticketTypeArray();
      const startDate = this.startDate();
      const endDate = this.endDate();
      const reportedByCurrentUser = this.reportedByCurrentUser();
      const selector = { communityId, category: 'ticket' };
      selector.createdAt = {};
      if (ticketTypeArray.length > 0) selector['ticket.type'] = { $in: ticketTypeArray };
      if (ticketStatusArray.length > 0) selector['ticket.status'] = { $in: ticketStatusArray };
      if (startDate) selector.createdAt.$gte = new Date(this.startDate());
      if (endDate) selector.createdAt.$lte = new Date(this.endDate());
      if (reportedByCurrentUser) selector.userId = Meteor.userId();
      if (ticketText) {
        return Topics.find(selector, { sort: { createdAt: -1 } }).fetch().filter(t => t.title.toLowerCase().search(ticketText.toLowerCase()) >= 0
      || t.text.toLowerCase().search(ticketText.toLowerCase()) >= 0);
      }
      return Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
    };
  }, /*
  closedTicketsDataFn() {
    return () => {
      const communityId = Session.get('activeCommunityId');
      return Topics.find({ communityId, category: 'ticket', 'ticket.status': 'closed' }).fetch();
    };
  },*/
  ticketsOptionsFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      const permissions = {
        edit: Meteor.userOrNull().hasPermission('ticket.update', communityId),
        delete: Meteor.userOrNull().hasPermission('ticket.remove', communityId),
      };
      return {
        columns: ticketColumns(permissions),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        searching: false,
        paging: false,
        info: false,
      };
    };
  }, /*
  closedTicketsOptionsFn() {
    return () => {
      return {
        columns: ticketColumns(),
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
      };
    };
  },*/
  statusValues() {
    return TicketStatusNames;
  },
  ticketTypes() {
    return Object.keys(TicketTypes);
  },
  /* taskStatusValues() {
    return Topics.taskStatusValues;
  },*/
  columns() {
    return Topics.columns;
  },
});

Template.Tickets_tasks.events({
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
  'click .js-type-filter'(event, instance) {
    const ticketType = $(event.target).data('value');
    const ticketTypeArray = instance.viewmodel.ticketTypeArray();

    const n = ticketTypeArray.includes(ticketType);
    if (n) {
      for (let i = 0; i <= ticketTypeArray.length; i += 1) {
        if (ticketTypeArray[i] === ticketType) {
          ticketTypeArray.splice(i, 1);
        }
      }
      instance.viewmodel.ticketTypeArray(ticketTypeArray);
      $(event.target).blur();
    } else {
      ticketTypeArray.push(ticketType);
      instance.viewmodel.ticketTypeArray(ticketTypeArray);
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
  /* 'change #ticket-type-selector'(event, instance) {
    instance.viewmodel.ticketTypeSelector($('#ticket-type-selector').val());
  },*/
});
