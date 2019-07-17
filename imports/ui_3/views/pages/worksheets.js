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
import { currentUserLanguage } from '/imports/startup/client/language.js';

import { Topics } from '/imports/api/topics/topics.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { importCollectionFromFile } from '/imports/utils/import.js';
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
  calendarView: false,
  searchText: '',
  ticketStatusArray: [],
  ticketTypeArray: [],
  startDate: '',
  endDate: '',
  reportedByCurrentUser: false,
  communityId: null,
  onCreated() {
    this.communityId(this.templateInstance.getCommunityId());
    this.setDefaultFilter();
  },
  setDefaultFilter() {
    this.searchText('');
    this.ticketStatusArray([]);
    this.ticketTypeArray([]);
    this.startDate(moment().subtract(30, 'days').format('YYYY-MM-DD'));
    this.endDate('');
    this.reportedByCurrentUser(false);
  },
  calendarOptions() {
    const viewmodel = this;
    return {
      lang: currentUserLanguage(),
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay',
      },
      editable: true,
      droppable: true, // this allows things to be dropped onto the calendar
      drop() {
        // is the "remove after drop" checkbox checked?
        if ($('#drop-remove').is(':checked')) {
            // if so, remove the element from the "Draggable Events" list
          $(this).remove();
        }
      },
      events(start, end, timezone, callback) {
        const events = Topics.find(viewmodel.filterSelector()).fetch().map(function (t) {
          return {
            title: t.title,
            start: t.ticket.expectedStart,
            end: t.ticket.expectedFinish,
            color: Tickets.statuses[t.status].colorCode,
          };
        });
        callback(events);
      },
    };
  },
  ticketStatuses() {
    return Object.values(Tickets.statuses);
  },
  ticketTypes() {
    return Tickets.typeValues;
  },
  hasFilters() {
    if (this.searchText() ||
        this.ticketStatusArray().length ||
        this.ticketTypeArray().length ||
        this.startDate() !== moment().subtract(30, 'days').format('YYYY-MM-DD') ||
        this.endDate() ||
        this.reportedByCurrentUser()) return true;
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
  filterSelector() {
    const communityId = Session.get('activeCommunityId');
    const ticketStatusArray = this.ticketStatusArray();
    const ticketTypeArray = this.ticketTypeArray();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    const selector = { communityId, category: 'ticket' };
    if (ticketTypeArray.length > 0) selector['ticket.type'] = { $in: ticketTypeArray };
    if (ticketStatusArray.length > 0) selector.status = { $in: ticketStatusArray };
    selector.createdAt = {};
    if (startDate) selector.createdAt.$gte = new Date(startDate);
    if (endDate) selector.createdAt.$lte = new Date(endDate);
    if (reportedByCurrentUser) selector.userId = Meteor.userId();
    return selector;
  },
  ticketsDataFn() {
    return () => {
      const selector = this.filterSelector();
      const searchText = this.searchText();
      let result = Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
      if (searchText) result = result.filter(t =>
        t.title.toLowerCase().search(searchText.toLowerCase()) >= 0
        || t.text.toLowerCase().search(searchText.toLowerCase()) >= 0
      );
      return result;
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
});

Template.Worksheets.events({
  'click .js-mode'(event, instance) {
    const oldVal = instance.viewmodel.calendarView();
    instance.viewmodel.calendarView(!oldVal);
  },
  'click .js-new'(event) {
    const type = $(event.target).closest('a').data('type');
    afTicketInsertModal(type);
  },
  'click .js-import'(event, instance) {
    importCollectionFromFile(Topics); // TODO Make it Ticket specific
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
    instance.viewmodel.setDefaultFilter();
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
});
