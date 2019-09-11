import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Tickets } from '/imports/api/topics/tickets/tickets.js';

import './new-ticket.html';

Template.New_Ticket.viewmodel({
  ticketTypes() {
    return Tickets.typeValues;
  },
});
