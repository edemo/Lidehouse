/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Topics } from '../topics.js';

Meteor.publish('topics.public', function topicsPublic(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  return Topics.find({
    communityId,
    userId: { $exists: false },
  }, {
    fields: Topics.publicFields,
  });
});

Meteor.publish('topics.private', function topicsPrivate(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  if (!this.userId) {
    return this.ready();
  }

  return Topics.find({
    communityId,
    userId: this.userId,
  }, {
    fields: Topics.publicFields,
  });
});
