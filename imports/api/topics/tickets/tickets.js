import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

Topics.helpers({
});

const ticketSchema = new SimpleSchema({
  type: { type: String, allowedValues: ['building', 'service'] },
  urgency: { type: String, allowedValues: ['high', 'normal', 'low'] },
  status: { type: String, allowedValues: ['reported', 'confirmed', 'progressing', 'finished', 'checked', 'closed'] },
});

Topics.attachSchema({ ticket: { type: ticketSchema, optional: true } });

_.extend(Topics.publicFields, { ticket: 1 });
