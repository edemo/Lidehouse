
import { Template } from 'meteor/templating';
import { TicketEventHandlers } from '/imports/ui_3/views/components/tickets-edit.js';
import './ticket-list.html';

Template.Ticket_list.events(TicketEventHandlers);
