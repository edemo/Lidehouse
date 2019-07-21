
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
import { afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal } from '/imports/ui_3/views/components/tickets-edit.js';
import './ticket-list.html';

Template.Ticket_list.events({
  'click .js-edit'(event) {
    const id = $(event.target).closest('[data-id]').data('id');
    afTicketUpdateModal(id, 'topicUpdate');
  },
  'click .js-status-update'(event) {
    const id = $(event.target).closest('[data-id]').data('id');
    afTicketUpdateModal(id, 'statusUpdate');
  },
  'click .js-status-change'(event) {
    const id = $(event.target).closest('[data-id]').data('id');
    const status = $(event.target).closest('[data-status]').data('status');
    afTicketStatusChangeModal(id, status);
  },
  'click .js-delete'(event) {
    const id = $(event.target).closest('[data-id]').data('id');
    deleteTicketConfirmAndCallModal(id);
  },
});
