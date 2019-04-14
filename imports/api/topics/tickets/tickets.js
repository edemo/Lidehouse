import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

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
