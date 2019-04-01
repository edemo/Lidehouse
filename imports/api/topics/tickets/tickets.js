import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

<<<<<<< HEAD
import { Topics } from '../topics.js';

Topics.ticketCategoryValues = ['building', 'garden', 'service'];
Topics.urgencyValues = ['high', 'normal', 'low'];
Topics.urgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};
Topics.statusValues = ['reported', 'confirmed', 'progressing', 'finished', 'checked', 'closed', 'deleted'];
Topics.statusColors = {
  reported: 'warning',
  confirmed: 'info',
  progressing: 'info',
  finished: 'primary',
  checked: 'primary',
  closed: 'default',
  deleted: 'danger',
};

Topics.taskStatusValues = ['scheduled', 'progressing', 'finished', 'checked', 'closed', 'deleted'];
Topics.taskStatusColors = {
  scheduled: 'warning',
  progressing: 'info',
  finished: 'primary',
  checked: 'primary',
  closed: 'default',
  deleted: 'danger',
};

Topics.columns = ['Status', 'Title', 'Reported by', 'Reported at', 'Type'];

const TicketsExtensionSchema = new SimpleSchema({
  category: { type: String, allowedValues: Topics.ticketCategoryValues, autoform: autoformOptions(Topics.ticketCategoryValues, 'schemaTickets.ticket.category.'), optional: true },
  urgency: { type: String, allowedValues: Topics.urgencyValues, autoform: autoformOptions(Topics.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  status: { type: String, allowedValues: Topics.statusValues, autoform: autoformOptions(Topics.statusValues, 'schemaTickets.ticket.status.') },
=======
import { Topics } from '/imports/api/topics/topics.js';
import { TicketUrgencyValues, TicketStatusNames, TicketTypeNames } from '/imports/api/topics/tickets/ticket-status.js';

export const Tickets = {};

Tickets.extensionSchema = new SimpleSchema({
  type: { type: String, allowedValues: TicketTypeNames, autoform: autoformOptions(TicketTypeNames, 'schemaTickets.ticket.type.') },
  status: { type: String, allowedValues: TicketStatusNames, autoform: autoformOptions(TicketStatusNames, 'schemaTickets.ticket.status.') },
//  category: { type: String, allowedValues: Tickets.categoryValues, autoform: autoformOptions(Topics.ticketCategoryValues, 'schemaTickets.ticket.category.'), optional: true },
  urgency: { type: String, allowedValues: TicketUrgencyValues, autoform: autoformOptions(TicketUrgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  localizer: { type: String, optional: true },

  expectedCost: { type: Number, decimal: true, optional: true },
  expectedStart: { type: Date, optional: true },
  expectedFinish: { type: Date, optional: true },
  expectedContinue: { type: Date, optional: true },
  waitingFor: { type: String, optional: true },
  actualCost: { type: Number, decimal: true, optional: true },
  actualStart: { type: Date, optional: true },
  actualFinish: { type: Date, optional: true },
  actualContinue: { type: Date, optional: true },
>>>>>>> upstream/ticket_statuses
});

Tickets.modifiableFields = ['ticket.category', 'ticket.urgency'];

Topics.helpers({
});

Topics.attachSchema({ ticket: { type: Tickets.extensionSchema, optional: true } });

_.extend(Topics.publicFields, { ticket: 1 });

Tickets.schema = new SimpleSchema([
  Topics.schema,
  { ticket: { type: Tickets.extensionSchema, optional: true } },
]);

Meteor.startup(function attach() {
  Tickets.schema.i18n('schemaTickets');   // translation is different from schemaTopics
});
