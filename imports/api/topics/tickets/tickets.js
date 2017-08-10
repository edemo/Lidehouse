import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { autoformOptions } from '/imports/utils/autoform.js';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

const typeValues = ['building', 'service'];
const urgencyValues = ['high', 'normal', 'low'];
const statusValues = ['reported', 'confirmed', 'progressing', 'finished', 'checked', 'closed'];

const ticketsExtensionSchema = new SimpleSchema({
  type: { type: String, allowedValues: typeValues, autoform: autoformOptions(typeValues), optional: true },
  urgency: { type: String, allowedValues: urgencyValues, autoform: autoformOptions(urgencyValues), optional: true },
  status: { type: String, allowedValues: statusValues, autoform: autoformOptions(statusValues) },
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
