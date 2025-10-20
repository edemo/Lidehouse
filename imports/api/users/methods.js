import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { checkExists, checkNotExists, checkModifier } from '/imports/api/method-checks.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Notifications } from '/imports/api/notifications/notifications.js';
import './users.js';

export const update = new ValidatedMethod({
  name: 'user.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Meteor.users, _id);
    if (_id !== this.userId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity', { method: 'users.update', userId: this.userId, _id });
    }
    checkModifier(doc, modifier, ['emails', 'status', 'services', 'heartbeat'], true);
    const newUsername = modifier.$set.username;
    if (newUsername && newUsername !== doc.username) {
      checkNotExists(Meteor.users, { _id: { $ne: doc._id }, username: newUsername });
    }
    Meteor.users.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'user.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    if (_id !== this.userId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity', { method: 'users.remove', userId: this.userId, _id });
    }
    // We are not removing the user document, because many references to it would be dangling
    // Just blanking out the personal user data
    if (Meteor.isServer) {
      Meteor.users.rawCollection().replaceOne({ _id }, {
        emails: [{ address: `deleteduser@${_id}.hu`, verified: true }],
        settings: { delegatee: false },
        username: 'deletedAccount_' + _id,
        avatar: '/images/avatars/avatarnull.png',
      }); // TODO .catch(); ?
    }
  },
});

export const updateMyLastSeen = new ValidatedMethod({
  name: 'user.updateMyLastSeen',
  validate: new SimpleSchema({
    topicId: { type: String, regEx: SimpleSchema.RegEx.Id },
    lastSeenInfo: { type: Object, blackbox: true },
    seenType: { type: Number, decimal: true, optional: true },
  }).validator(),

  run({ topicId, lastSeenInfo, seenType }) {
    const user = Meteor.users.findOne(this.userId);
    const modifier = {};
    modifier['$set'] = {};
    // When we call this method from the client it implicates SEEN_BY.EYES, if we call it from the server it is always SEEN_BY.NOTI
    if (!seenType) seenType = Meteor.users.SEEN_BY.EYES;
    const lastSeens = user.lastSeens();
    if (lastSeens[seenType][topicId]?.timestamp > lastSeenInfo.timestamp) return;
    // When user seen it by EYES, it implies no NOTI needed - so lastSeen info propagates upwards (SEEN_BY.EYES=0, SEEN_BY.NOTI=1)
    for (let i = seenType; i <= Meteor.users.SEEN_BY.NOTI; i++) {
      modifier['$set']['lastSeens.' + i + '.' + topicId] = lastSeenInfo;
    }
    Notifications.update({ userId: this.userId }, modifier);
  },
});
 
if (Meteor.isClient) {
  import { handleError } from '/imports/ui_3/lib/errors.js';

  Meteor.users.helpers({
    hasNowSeen(topicId) {
      // This helper can be called from the client any amount of times the user has just seen this topic.
      // The lastseen info needs to be updated on the server, only if some notifications are due to this client
      // Otherwise we should not bother the server constantly with requests, that we saw this thing.
      const seenType = Meteor.users.SEEN_BY.EYES;
      const Topics = Mongo.Collection.get('topics');
      const topic = Topics.findOne(topicId);
      const oldLastSeenInfo = this.lastSeens()[seenType][topic._id];
      const comments = topic.comments().fetch(); // returns newest-first order
      const lastseenTimestamp = comments[0] ? comments[0].createdAt : topic.createdAt;
      const newLastSeenInfo = { timestamp: lastseenTimestamp };
      if (oldLastSeenInfo && oldLastSeenInfo.timestamp.getTime() >= newLastSeenInfo.timestamp.getTime()) {
        return; // this avoids infinite loop and unnecessary server bothering
      }
      updateMyLastSeen.call({ topicId, lastSeenInfo: newLastSeenInfo }, handleError);
    },
  });
}

export function mergeLastSeen(user, topicId, destinationId) {
  const lastSeens = user.lastSeens();
  const destinationTopic = Topics.findOne(destinationId);
  _.each(Meteor.users.SEEN_BY, (seenBy) => {
    const sourceTopicTimestamp = lastSeens[seenBy][topicId]?.timestamp;
    const destinationTimestamp = lastSeens[seenBy][destinationId]?.timestamp || 0;
    if (sourceTopicTimestamp && (sourceTopicTimestamp > destinationTimestamp)
    && destinationTopic.unseenCommentCountBy(user._id, seenBy) === 0) {
      const lastSeenInfo = { timestamp: sourceTopicTimestamp };
      updateMyLastSeen._execute({ userId: user._id }, { topicId: destinationId, lastSeenInfo, seenType: seenBy });
    }
  });
}

Meteor.users.methods = Meteor.users.methods || {};
_.extend(Meteor.users.methods, { update, remove, updateMyLastSeen });
