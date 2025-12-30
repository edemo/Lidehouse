import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { ReactiveDict } from 'meteor/reactive-dict';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';

import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { defaultBeginDate, defaultEndDate } from '/imports/ui_3/helpers/utils.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { _ } from 'meteor/underscore';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';
import { currentUserLanguage } from '/imports/startup/client/language.js';
import { DatatablesSelectAndExportButtons } from '/imports/ui_3/views/blocks/datatables.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import '/imports/api/topics/tickets/actions.js';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';
import { ticketColumns } from '/imports/api/topics/tickets/tables.js';
import { importCollectionFromFile } from '/imports/ui_3/views/components/import-dialog.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import '/imports/ui_3/views/components/new-ticket.js';
import { ContextMenu } from '/imports/ui_3/views/components/context-menu';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import { toggle } from '/imports/api/utils';
import './worksheets.html';

Template.Worksheets.viewmodel({
  eventsToUpdate: {},
  calendarView: false,
  showNeedToSaveWarning: true,
  searchText: '',
  ticketStatusSelected: [],
  ticketTypeSelected: [],
  ticketUrgencySelected: [],
  startDate: '',
  endDate: '',
  byStartDate: false,
  reportedByCurrentUser: false,
  communityId() {
    return getActiveCommunityId();
  },
  community() {
    return Communities.findOne(this.communityId());
  },
  onCreated(instance) {
    this.setDefaultFilter();
    ContextMenu.initialize('Worksheets', Topics, this);
    ModalStack.setVar('relation', 'supplier', true);
    instance.autorun(() => {
      const communityId = this.communityId();
      instance.subscribe('communities.byId', { _id: communityId });
      if (!this.ticketStatusSelected().length || _.intersection(['closed', 'deleted'], this.ticketStatusSelected()).length) {
        instance.subscribe('topics.list', { communityId, category: 'ticket', status: { $in: ['closed', 'deleted'] } });
      }
      instance.subscribe('contracts.inCommunity', { communityId });
      instance.subscribe('partners.inCommunity', { communityId });
    });
  },
  onDestroyed() {
    ModalStack.setVar('expectedStart', undefined);
  },
  setDefaultFilter() {
    this.searchText('');
    this.ticketStatusSelected([]);
    this.ticketTypeSelected([]);
    this.ticketUrgencySelected([]);
    this.startDate(defaultBeginDate());
    this.endDate('');
    this.byStartDate(false);
    this.reportedByCurrentUser(false);
  },
  hasFilters() {
    if (this.searchText() ||
        this.ticketStatusSelected().length ||
        this.ticketTypeSelected().length ||
        this.ticketUrgencySelected().length ||
        this.startDate() !== moment().subtract(90, 'days').format('YYYY-MM-DD') ||
        this.endDate() ||
        this.byStartDate() ||
        this.reportedByCurrentUser())
        return true;
    return false;
  },
  addEventsToUpdate(eventObject) {
    const eventsToUpdate = this.eventsToUpdate();
    eventsToUpdate[eventObject.id] = eventObject;
    const newRef = _.clone(eventsToUpdate);
    this.eventsToUpdate(newRef);
  },
  warnToSave() {
    const viewmodel = this;
    if (viewmodel.showNeedToSaveWarning()) {
      Modal.show('Modal', {
        title: 'Warning',
        text: __('youNeedToSaveYourChanges'),
        btnOK: 'OK',
        onOK() { viewmodel.showNeedToSaveWarning(false); },
      });
    }
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
      eventClick(eventObject, jsEvent) {
        event.stopPropagation();
        const contextObj = {
          template: 'Action_buttons_dropdown_list',
          actions: 'statusUpdate,statusChange,edit,delete',
          collection: 'topics',
          options: {},
          id: eventObject._id,
        };
        ContextMenu.show(event, contextObj, viewmodel);
      },
      dayClick(date, jsEvent, view) {
        ModalStack.setVar('expectedStart', date.toDate());
        event.stopPropagation();
        const contextObj = {
          template: 'New_Ticket',
        };
        ContextMenu.show(event, contextObj, viewmodel );
      },
      eventResizeStop(eventObject, jsEvent, ui, view) {
        viewmodel.addEventsToUpdate(eventObject);
        viewmodel.warnToSave();
      },
      eventDrop(eventObject) {
        viewmodel.addEventsToUpdate(eventObject);
        viewmodel.warnToSave();
      },
      editable: true,
      events(start, end, timezone, callback) {
        const events = Topics.find(viewmodel.filterSelector()).fetch().map(function (t) {
        const start = t.ticket.actualStart || t.ticket.expectedStart || t.createdAt;
        const end = t.ticket.actualFinish || t.ticket.expectedFinish;
        const editable = _.contains(t.modifiableFieldsByStatus(), 'expectedStart');
          return {
            title: t.title,
            start,
            end,
            color: Tickets.statuses[t.status].colorCode,
            id: t._id,
            status: t.status,
            editable,
          };
        });
        if (!_.isEmpty(viewmodel.eventsToUpdate())) {
          const eventsToUpdate = viewmodel.eventsToUpdate();
          events.forEach((eventObject) => {
            if (eventsToUpdate[eventObject.id]) {
              if (eventsToUpdate[eventObject.id].start) eventObject.start = eventsToUpdate[eventObject.id].start.toISOString();
              if (eventsToUpdate[eventObject.id].end) eventObject.end = eventsToUpdate[eventObject.id].end.toISOString();
            }
          });
        }
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
  ticketUrgencies() {
    return Tickets.urgencyValues;
  },
  ticketsUrgencyColor(name) {
    return Tickets.urgencyColors[name];
  },
  activeButton(field, value) {
    const selected = this[`${field}Selected`]();
    return selected.includes(value) && 'active';
  },
  filterSelector() {
    const communityId = this.communityId();
    const ticketStatusSelected = this.ticketStatusSelected();
    const ticketTypeSelected = this.ticketTypeSelected();
    const ticketUrgencySelected = this.ticketUrgencySelected();
    const startDate = this.startDate();
    const endDate = this.endDate();
    const byStartDate = this.byStartDate();
    const reportedByCurrentUser = this.reportedByCurrentUser();
    const selector = { communityId, category: 'ticket' };
    if (ticketStatusSelected.length > 0) selector.status = { $in: ticketStatusSelected };
    if (ticketTypeSelected.length > 0) selector['ticket.type'] = { $in: ticketTypeSelected };
    if (ticketUrgencySelected.length > 0) selector['ticket.urgency'] = { $in: ticketUrgencySelected };
    selector.createdAt = {};
    if (startDate && !byStartDate) selector.createdAt.$gte = new Date(startDate);
    if (endDate && !byStartDate) selector.createdAt.$lte = new Date(endDate);
    if (byStartDate) selector.$and = [];
    if (startDate && byStartDate) selector.$and.push({ $or: [
      { 'ticket.expectedStart': { $gte: new Date(startDate) } }, 
      { 'ticket.actualStart': { $gte: new Date(startDate) } }] });
    if (endDate && byStartDate) selector.$and.push({ $or: [
      { $and: [{ 'ticket.expectedStart': { $lte: new Date(endDate) } }, { 'ticket.actualStart': { $exists: false } }] }, 
      { 'ticket.actualStart': { $lte: new Date(endDate) } }] });
    if (reportedByCurrentUser) selector.creatorId = Meteor.userId();
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
      const community = self.community();
      const permissions = {
        view: true,
        edit: Meteor.userOrNull().hasPermission('ticket.update', { communityId }),
        statusChange: Meteor.userOrNull().hasPermission('ticket.statusChange', { communityId }),
        statusUpdate: Meteor.userOrNull().hasPermission('ticket.statusChange', { communityId }),
        delete: Meteor.userOrNull().hasPermission('ticket.remove', { communityId }),
      };
      return {
        columns: ticketColumns(permissions),
        order: [[7, 'desc']],
        tableClasses: 'display',
        language: datatables_i18n[TAPi18n.getLanguage()],
        lengthMenu: [[25, 100, 250, -1], [25, 100, 250, __('all')]],
        pageLength: 25,
        ...DatatablesSelectAndExportButtons(community, Topics, 'worksheets'),
      };
    };
  },
});

Template.Worksheets.events({ 
  ...(actionHandlers(Topics, 'create,view')),
  'click .js-mode'(event, instance) {
    const oldVal = instance.viewmodel.calendarView();
    instance.viewmodel.calendarView(!oldVal);
  },
  'click .js-import'(event, instance) {
    importCollectionFromFile(Topics); // TODO Make it Ticket specific
  },
  'click .js-clear-filter'(event, instance) {
    instance.viewmodel.setDefaultFilter();
  },
  'click .js-toggle-filter'(event, instance) {
    const field = $(event.target).data('field');
    const value = $(event.target).data('value');
    const vmFunc = instance.viewmodel[`${field}Selected`];
    const selected = vmFunc();
    const newSelected = toggle(value, selected);
    vmFunc(newSelected);
    $(event.target).blur();  // if focus is on the button it appears to be pushed
  },
  'click .js-save-calendar'(event, instance) {
    const eventsToUpdate = instance.viewmodel.eventsToUpdate();
    const args = [];
    const communityId = instance.viewmodel.communityId();
    _.forEach(eventsToUpdate, function(value, key) {
      const dates = {};
      if (value.start) dates['ticket.expectedStart'] = value.start.toISOString();
      if (value.end) dates['ticket.expectedFinish'] = value.end.toISOString();
      const modifier = { $set: dates };
      args.push({ _id: key, modifier });
    });
    Topics.methods.batch.statusUpdate.call({ args });
    instance.viewmodel.eventsToUpdate({});
  },
  'click .js-cancel-calendar'(event, instance) {
    instance.viewmodel.eventsToUpdate({});
  },
});
