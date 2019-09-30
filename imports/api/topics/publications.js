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
  const user = Meteor.users.findOneOrNull(this.userId);

  const selector = {
    communityId,
    // Filter for 'No participantIds (meaning everyone), or contains userId'
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: this.userId },
    ],
  };

  const publicFields = Topics.publicFields.extendForUser(this.userId, communityId);
  if (!user.hasPermission('topics.inCommunity', communityId)) return this.ready();

  return [
    Topics.find(selector, { fields: publicFields }),
  ];
});

Meteor.publishComposite('topics.byId', function topicsById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;
  const topic = Topics.findOne(_id);
  const publicFields = Topics.publicFields;//.extendForUser(this.userId, communityId);
  const user = Meteor.users.findOneOrNull(this.userId);

  const selector = {
    _id,
    // Filter for 'No participantIds (meaning everyone), or contains userId'
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: this.userId },
    ],
  };

  if (!user.hasPermission('topics.inCommunity', topic.communityId)) return this.ready();
  return {
    find() {
      return Topics.find(selector, { fields: publicFields });
    },
    children: [{
      // Publish the author of the Topic (for flagging status)
      find(topic) {
        return Meteor.users.find({ _id: topic.userId }, { fields: Meteor.users.publicFields });
      },
    }, {
      // Publish all Comments of the Topic
      find(topic) {
        return Comments.find({ topicId: topic._id }, { fields: Comments.publicFields });
      },
      children: [{
        find(comment) {
          return Meteor.users.find({ _id: comment.userId }, { fields: Meteor.users.publicFields });
        },
      }],
    }],
  };
});
