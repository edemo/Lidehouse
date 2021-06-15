/* eslint-disable prefer-arrow-callback */
/* globals check */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Topics } from '/imports/api/topics/topics.js';
import { Votings } from '/imports/api/topics/votings/votings.js';
import { Comments } from '/imports/api/comments/comments.js';
import { Contracts } from '/imports/api/contracts/contracts.js';
import { Partners } from '/imports/api/partners/partners.js';

// TODO: If you pass in a function instead of an object of params, it passes validation

Meteor.publishComposite('topics.byId', function topicsById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;
  const topic = Topics.findOne(_id);
  const communityId = topic.communityId;
  const user = Meteor.users.findOneOrNull(this.userId);

  if (!user.hasPermission('topics.inCommunity', { communityId })) return this.ready();

  const publicFields = Votings.extendPublicFieldsForUser(user._id, communityId);
  function visibleFields() {
    if (topic.category === 'vote' && (topic.status === 'closed' || topic.status === 'votingFinished')) {
      return _.extend({}, Topics.publicFields, Votings.voteResultDetailsFields);
    }
    return publicFields;
  }
  const selector = {
    _id,
    // Filter for 'No participantIds (meaning everyone), or contains userId'
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: this.userId },
    ],
  };

  return {
    find() {
      return Topics.find(selector, { fields: visibleFields() });
    },
    children: [{
      // Publish the author of the Topic (for flagging status)
      find(topic) {
        return Meteor.users.find({ _id: topic.creatorId }, { fields: Meteor.users.publicFields });
      },
    }, {
      // Publish all Comments of the Topic
      find(topic) {
        return Comments.find({ communityId: topic.communityId, topicId: topic._id }, { fields: Comments.publicFields });
      },
      children: [{
        find(comment) {
          return Meteor.users.find({ _id: comment.creatorId }, { fields: Meteor.users.publicFields });
        },
      }],
    }, {
      find(topic) {
        if (topic.ticket && topic.ticket.contractId) {
          return Contracts.find({ _id: topic.ticket.contractId });
        }
      },
    }, {
      find(topic) {
        if (topic.ticket && topic.ticket.partnerId) {
          return Partners.find({ _id: topic.ticket.partnerId });
        }
      },
    }],
  };
});

Meteor.publishComposite('topics.active', function topicsBoard(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('topics.inCommunity', { communityId })) return this.ready();

  const selector = {
    communityId,
    closed: false,
    category: { $in: ['vote', 'forum', 'news', 'ticket'] },
    // Filter for 'No participantIds (meaning everyone), or contains userId'
    $or: [
      { participantIds: { $exists: false } },
      { participantIds: this.userId },
    ],
  };

  const publicFields = Votings.extendPublicFieldsForUser(this.userId, communityId);

  return {
    find() {
      return Topics.find(selector, { fields: publicFields });
    },
    children: [{
      find(topic) {
        return Comments.find({ topicId: topic._id }, { limit: 5, sort: { createdAt: -1 } });
      },
    }, {
      find(topic) {
        if (topic.category === 'vote' && topic.status === 'votingFinished') {
          return Topics.find({ _id: topic._id }, { fields: _.extend({}, Topics.publicFields, { voteResults: 1, voteSummary: 1 }) });
        }
      },
    }],
  };
});

Meteor.publish('topics.list', function topicsList(params) {
  new SimpleSchema({
    communityId: { type: String },
    category: { type: String, optional: true },
    closed: { type: Boolean, optional: true },
    status: { type: Object, blackbox: true, optional: true },
  }).validate(params);
  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);

  if (!user.hasPermission('topics.inCommunity', { communityId })) {
    return this.ready();
  }

  const selector = _.extend({}, params, { $or: [{ participantIds: { $exists: false } }, { participantIds: this.userId }] });

  return Topics.find(selector, { fields: Topics.publicFields });
});

Meteor.publishComposite('topics.roomsOfUser', function roomsOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const { userId } = params;
  if (userId !== this.userId) return this.ready();
  const user = Meteor.users.findOne(userId);
  if (!user.hasPermission('topics.inCommunity', { communityId })) return this.ready();

  const selector = {
    communityId,
    category: 'room',
    participantIds: userId,
  };
  const publicFields = Topics.publicFields;

  return {
    find() {
      return Topics.find(selector, { fields: publicFields });
    },
    children: [{
      find(topic) {
        return Comments.find({ topicId: topic._id }, { sort: { createdAt: -1 } });
      },
    }],
  };
});
