import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

import { Topics } from '/imports/api/topics/topics.js';
import { TicketStatusNames, TicketTypeNames } from '/imports/api/topics/tickets/ticket-status.js';

Topics.ticketCategoryValues = ['building', 'garden', 'service'];
Topics.urgencyValues = ['high', 'normal', 'low'];
Topics.urgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};

const TicketsExtensionSchema = new SimpleSchema({
  type: { type: String, allowedValues: TicketTypeNames, autoform: autoformOptions(TicketTypeNames, 'schemaTickets.ticket.type.') },
  status: { type: String, allowedValues: TicketStatusNames, autoform: autoformOptions(TicketStatusNames, 'schemaTickets.ticket.status.') },
  category: { type: String, allowedValues: Topics.ticketCategoryValues, autoform: autoformOptions(Topics.ticketCategoryValues, 'schemaTickets.ticket.category.'), optional: true },
  urgency: { type: String, allowedValues: Topics.urgencyValues, autoform: autoformOptions(Topics.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  localizer: { type: String, optional: true },

  expectedCost: { type: Number, decimal: true, optional: true },
  expectedStart: { type: Date, optional: true },
  expectedFinish: { type: Date, optional: true },
  expectedContinue: { type: Date, optional: true },
  actualCost: { type: Number, decimal: true, optional: true },
  actualStart: { type: Date, optional: true },
  actualFinish: { type: Date, optional: true },
  actualContinue: { type: Date, optional: true },
});

export const TicketFields = ['ticket.category', 'ticket.urgency', 'ticket.status'];
export const TicketModifiableFields = ['ticket.category', 'ticket.urgency'];

Topics.helpers({
});

Topics.attachSchema({ ticket: { type: TicketsExtensionSchema, optional: true } });

_.extend(Topics.publicFields, { ticket: 1 });

export const ticketsSchema = new SimpleSchema([
  Topics.schema,
  { ticket: { type: TicketsExtensionSchema, optional: true } },
]);

Meteor.startup(function attach() {
  ticketsSchema.i18n('schemaTickets');   // translation is different from schemaTopics
});
