import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

Topics.helpers({
});

const roomsSchema = new SimpleSchema({
  participantIds: { type: Array, optional: true },
  'participantIds.$': { type: String, regEx: SimpleSchema.RegEx.Id },   // userIds
});

Topics.attachSchema(roomsSchema);
