/* eslint-disable prefer-arrow-callback */
/* globals check */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import './votings/votings.js';

// TODO: If you pass in a function instead of an object of params, it passes validation

Meteor.publish('topics.inCommunity', function topicsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  const selector = {
    communityId,
    // Filter for 'No participantIds (meaning everyone), or contains userId'
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: this.userId },
    ],
  };

  const publicFields = Topics.publicFields.extendForUser(this.userId, communityId);

  return Topics.find(selector, { fields: publicFields });
});

Meteor.publishComposite('topics.byId', function topicsById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;

  const publicFields = Topics.publicFields;//.extendForUser(this.userId, communityId);

  return {
    find() {
      return Topics.find({ _id }, { fields: publicFields });
    },
    children: [{
      // Publish all Comments of the Topic
      find(topic) {
        return Comments.find({ topicId: topic._id }, { fields: Comments.publicFields });
      },
    }],
  };
});

