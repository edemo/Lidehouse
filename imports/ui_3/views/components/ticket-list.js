
import { Template } from 'meteor/templating';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/topics/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import './ticket-list.html';

Template.Ticket_list.events(
  actionHandlers(Topics)
);
