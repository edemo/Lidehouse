import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

Topics.ticketCategoryValues = ['building', 'garden', 'service'];
Topics.urgencyValues = ['high', 'normal', 'low'];
Topics.urgencyColors = {
  high: 'danger',
  normal: 'warning',
  low: 'primary',
};
Topics.statusValues = ['reported', 'confirmed', 'progressing', 'finished', 'checked', 'closed'];
Topics.statusColors = {
  reported: 'warning',
  confirmed: 'info',
  progressing: 'info',
  finished: 'primary',
  checked: 'primary',
  closed: 'default',
};

const ticketsExtensionSchema = new SimpleSchema({
  category: { type: String, allowedValues: Topics.ticketCategoryValues, autoform: autoformOptions(Topics.ticketCategoryValues, 'schemaTickets.ticket.category.'), optional: true },
  urgency: { type: String, allowedValues: Topics.urgencyValues, autoform: autoformOptions(Topics.urgencyValues, 'schemaTickets.ticket.urgency.'), optional: true },
  status: { type: String, allowedValues: Topics.statusValues, autoform: autoformOptions(Topics.statusValues, 'schemaTickets.ticket.status.') },
});

Topics.helpers({
});

Topics.attachSchema({ ticket: { type: ticketsExtensionSchema, optional: true } });

_.extend(Topics.publicFields, { ticket: 1 });

export const ticketsSchema = new SimpleSchema([
  Topics.schema,
  { ticket: { type: ticketsExtensionSchema, optional: true } },
]);

Meteor.startup(function attach() {
  ticketsSchema.i18n('schemaTickets');   // translation is different from schemaTopics
});
