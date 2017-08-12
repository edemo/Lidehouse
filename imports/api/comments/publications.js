/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Comments } from './comments.js';
// import { Topics } from '../topics/topics.js';

Meteor.publish('comments.onTopic', function commentsOnTopic(params) {
  new SimpleSchema({
    topicId: { type: String },
  }).validate(params);
  const { topicId } = params;

  return Comments.find({ topicId }, { fields: Comments.publicFields });
});
