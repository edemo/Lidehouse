import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { Session } from 'meteor/session';
import { Topics } from '/imports/api/topics/topics.js';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { afTicketInsertModal, afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal }
  from '/imports/ui_3/views/components/tickets-edit.js';
import '/imports/ui_3/views/modals/autoform-edit.js';
import '/imports/ui_3/views/modals/confirmation.js';
import '/imports/ui_3/views/blocks/chopped.js';
import './tickets-simple.html';

Template.Tickets_simple.onCreated(function onCreated() {
  this.getCommunityId = () => FlowRouter.getParam('_cid') || Session.get('activeCommunityId');
  this.autorun(() =>
    this.subscribe('communities.byId', { _id: this.getCommunityId() })
  );
});

Template.Tickets_simple.onRendered(function slim() {
  $('.own-tickets-content').slimScroll({
    height: '188px',
    railOpacity: 0.4,
    wheelStep: 10,
    touchScrollStep: 75,
  });
});

Template.Tickets_simple.viewmodel({
  ticketText: '',
  communityId: null,
  statusColor(value) {
    return Topics.statusColors[value];
  },
  ownTickets() {
    const userId = Meteor.userId();
    const communityId = Session.get('activeCommunityId');
    return Topics.find({ communityId, category: 'ticket', userId }, { sort: { createdAt: -1 } }).fetch();
  },
  tickets() {
    const communityId = Session.get('activeCommunityId');
    const ticketText = this.ticketText();
    const selector = { communityId, category: 'ticket' };
    selector.createdAt = {};
    if (ticketText) {
      return Topics.find(selector, { sort: { createdAt: -1 } }).fetch().filter(t => t.title.toLowerCase().search(ticketText.toLowerCase()) >= 0
      || t.text.toLowerCase().search(ticketText.toLowerCase()) >= 0);
    }
    return Topics.find(selector, { sort: { createdAt: -1 } }).fetch();
  },
  columns() {
    return Topics.columns;
  },
});

Template.Tickets_simple.events({
  'click .js-new'() {
    afTicketInsertModal();
  },
  'click .js-edit'(event) {
    const id = $(event.target).data('id');
    afTicketUpdateModal(id);
    event.stopPropagation();
  },
  'click .js-status'(event) {
    const id = $(event.target).data('id');
    afTicketStatusChangeModal(id);
    event.stopPropagation();
  },
  'click .js-delete'(event) {
    const id = $(event.target).data('id');
    deleteTicketConfirmAndCallModal(id);
    event.stopPropagation();
  },
  'keyup .js-search'(event, instance) {
    instance.viewmodel.ticketText(event.target.value);
  },
  'click .ticket-row'() {
    window.location.pathname = $('.ticket-row').data('href');
  }
});
