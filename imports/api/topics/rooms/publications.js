/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { Topics } from '../topics.js';
import './rooms.js';

// Meteor.publish(null, function roomsOfUser() {
//   return Topics.find({ category: 'room', participantIds: this.userId });
// });
