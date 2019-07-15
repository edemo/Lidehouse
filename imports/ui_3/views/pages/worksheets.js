import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { ReactiveDict } from 'meteor/reactive-dict';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { _ } from 'meteor/underscore';

import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { afTicketInsertModal, afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal }
  from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './worksheets.html';

Template.Worksheets.onCreated(function onCreated() {
  this.getCommunityId = () => FlowRouter.getParam('_cid') || Session.get('activeCommunityId');
  this.autorun(() =>
    this.subscribe('communities.byId', { _id: this.getCommunityId() })
  );
});

Template.Worksheets.viewmodel({
  ticketText: '',
  ticketStatusArray: [],
  ticketTypeArray: Tickets.typeValues,
  startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
  endDate: '',
  reportedByCurrentUser: false,
  communityId: null,
  ticketTypeSelector: '',
  sortBy: { createdAt: -1 },
  onCreated() {
    this.communityId(this.templateInstance.getCommunityId());
  },
  ticketStatuses() {
    return Object.values(Tickets.statuses);
  },
  ticketTypes() {
    return Tickets.typeValues;
  },
  urgencyColor(value) {
    return Topics.urgencyColors[value];
  },
  ticketsSchema() {
    return Tickets.chema;
  },
  noFilters() {
    const ticketText = this.ticketText();
    const ticketStatusArray = this.ticketStatusArray();
    const ticketTypeArray = this.ticketTypeArray();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    if (!ticketText &&
        ticketStatusArray.length === 0 &&
        ticketTypeArray.length === 0 && !startDate &&
        !endDate &&
        !reportedByCurrentUser) return true;
    return false;
  },
  activeStatusButton(data) {
    const ticketStatusArray = this.ticketStatusArray();
    if ((ticketStatusArray.includes(data))) return 'active';
    return '';
  },
  activeTypeButton(data) {
    const ticketTypeArray = this.ticketTypeArray();
    if ((ticketTypeArray.includes(data))) return 'active';
    return '';
  },
  recentTickets() {
    const communityId = Session.get('activeCommunityId');
    const recentTickets = [];
    const allTickets = Topics.find({ communityId, category: 'ticket',
      $or: [{ status: { $ne: 'closed' } }, { createdAt: { $gt: moment().subtract(1, 'week').toDate() } }],
    }, { sort: { createdAt: -1 } }).fetch();
    for (let i = 0; i <= 1; i += 1) {
      recentTickets.push(allTickets[i]);
    }
    return recentTickets;
  },
  ticketsDataFn() {
    return () => {
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
      if (ticketStatusArray.length > 0) selector.status = { $in: ticketStatusArray };
      if (startDate) selector.createdAt.$gte = new Date(this.startDate());
      if (endDate) selector.createdAt.$lte = new Date(this.endDate());
      if (reportedByCurrentUser) selector.userId = Meteor.userId();
      if (ticketText) {
        return Topics.find(selector, { sort: { createdAt: -1 } }).fetch().filter(t => t.title.toLowerCase().search(ticketText.toLowerCase()) >= 0
      || t.text.toLowerCase().search(ticketText.toLowerCase()) >= 0);
      }
      return Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
    };
  },
  ticketsOptionsFn() {
    const self = this;
    return () => {
      const communityId = self.communityId();
      const permissions = {
        view: true,
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
  },
  tableColumns() {
    const tableColumns = [
      { name: 'status', sortBy: 'status' },
      { name: 'text', sortBy: 'title' },
      { name: 'type', sortBy: 'ticket.type' },
      { name: 'createdBy', sortBy: 'userId' },
      { name: 'createdAt', sortBy: 'createdAt' },
    ];
    return tableColumns;
  },
  columns() {
    return Topics.columns;
  },
});

Template.Worksheets.events({
  'click .js-new'(event) {
    const type = $(event.target).closest('a').data('type');
    afTicketInsertModal(type);
  },
  'click .js-view'(event) {
    const id = $(event.target).closest('button').data('id');
    FlowRouter.go('Topic show', { _tid: id });
  },
  'click .js-edit'(event) {
    const id = $(event.target).closest('button').data('id');
    afTicketUpdateModal(id);
  },
  'click .js-status'(event) {
    const id = $(event.target).closest('a').data('id');
    const status = $(event.target).closest('a').data('status');
    afTicketStatusChangeModal(id, status);
  },
  'click .js-delete'(event) {
    const id = $(event.target).closest('button').data('id');
    deleteTicketConfirmAndCallModal(id);
  },
  'click .js-clear-filter'(event, instance) {
    instance.viewmodel.ticketText('');
    instance.viewmodel.ticketStatusArray([]);
    instance.viewmodel.ticketTypeArray([]);
    instance.viewmodel.startDate('');
    instance.viewmodel.endDate('');
    instance.viewmodel.reportedByCurrentUser(false);
  },
  'click .js-status-filter'(event, instance) {
    const ticketStatus = $(event.target).data('value');
    const ticketStatusArray = instance.viewmodel.ticketStatusArray();
    if (ticketStatusArray.includes(ticketStatus)) {
      instance.viewmodel.ticketStatusArray(_.without(ticketStatusArray, ticketStatus));
      $(event.target).blur();
    } else {
      ticketStatusArray.push(ticketStatus);
      instance.viewmodel.ticketStatusArray(ticketStatusArray);
    }
  },
  'click .js-type-filter'(event, instance) {
    const ticketType = $(event.target).data('value');
    const ticketTypeArray = instance.viewmodel.ticketTypeArray();
    if (ticketTypeArray.includes(ticketType)) {
      instance.viewmodel.ticketTypeArray(_.without(ticketTypeArray, ticketType));
      $(event.target).blur();
    } else {
      ticketTypeArray.push(ticketType);
      instance.viewmodel.ticketTypeArray(ticketTypeArray);
    }
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.ticketText(event.target.value);
  },
});
