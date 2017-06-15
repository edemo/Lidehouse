/* eslint-disable prefer-arrow-callback */
/* globals check */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Topics } from './topics.js';
import './votings/votings.js';

// TODO: If you pass in a function instead of an object of params, it passes validation
Meteor.publish('topics.inCommunity', function topicsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  const publicFields = Topics.publicFields.extendForUser(this.userId, communityId);

  return Topics.find({ communityId }, { fields: publicFields });
});
