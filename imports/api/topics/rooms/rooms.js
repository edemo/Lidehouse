import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Topics } from '../topics.js';

// static helpers
Topics.messengerRoom = function messengerRoom(userId, otherUserId) {
  return Topics.findOne({ category: 'room', participantIds: { $size: 2, $all: [userId, otherUserId] } });
};

const roomSchema = new SimpleSchema({
});

Topics.helpers({
});

Topics.attachSchema(roomSchema);
