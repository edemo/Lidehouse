
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal } from '/imports/ui_3/views/components/tickets-edit.js';
import './ticket-list.html';

Template.Ticket_list.events({
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
});
