import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './tickets-control.html';
import { afTicketInsertModal, afTicketUpdateModal, afTicketStatusChangeModal, deleteTicketConfirmAndCallModal }
  from '/imports/ui_3/views/components/tickets-edit.js';

Template.Tickets_control.viewmodel({

});

Template.Tickets_control.events({
  'click .js-new'() {
    afTicketInsertModal();
  },
});