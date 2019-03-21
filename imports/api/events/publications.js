/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Events } from './events.js';
// import { Topics } from '../topics/topics.js';

Meteor.publish('events.onTopic', function commentsOnTopic(params) {
  new SimpleSchema({
    topicId: { type: String },
  }).validate(params);
  const { topicId } = params;

  return Events.find({ topicId }, { fields: Events.publicFields });
});
