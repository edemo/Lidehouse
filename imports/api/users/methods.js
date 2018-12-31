import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';

import { checkExists, checkNotExists, checkModifier, checkAddMemberPermissions } from '/imports/api/method-checks.js';
import { debugAssert } from '/imports/utils/assert.js';
import { toggleElementInArray } from '/imports/api/utils.js';
import { Topics } from '/imports/api/topics/topics.js';

import './users.js';

export const invite = new ValidatedMethod({
  name: 'user.invite',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ email, communityId }) {
    const inviter = Meteor.user();
    const userId = Accounts.createUser({ email, password: 'initialPassword', language: inviter.language() });
    if (Meteor.isServer) {
      Accounts.sendEnrollmentEmail(userId);
      // userId supposed to be good at this point on the client, but it is NOT,
      // so I can only add the user to the community on the server side (not nice)
      // insertMember.call({ userId, communityId, role: 'guest' });
    }
    return userId;
  },
});

export const update = new ValidatedMethod({
  name: 'user.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    const doc = checkExists(Meteor.users, _id);
    if (_id !== this.userId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: users.update, userId: ${this.userId}, _id: ${_id}`);
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
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: user.remove, userId: ${this.userId}, _id: ${_id}`);
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

let updateCall;
if (Meteor.isClient) {
  import { displayMessage, handleError } from '/imports/ui_3/lib/errors.js';

  updateCall = function (context, params) {
    // displayMessage('warning', `You just seen ${params.modifier.$set.lastSeens}`); // debug
    update.call(params, handleError);
  };
} else if (Meteor.isServer) {
  updateCall = function (context, params) {
    update._execute(context, params);
  };
}

Meteor.users.helpers({
  hasNowSeen(topicId, seenType) {
    // The user has just seen this topic, so the lastseen info needs to be updated  
    debugAssert(seenType === Meteor.users.SEEN_BY.EYES || seenType === Meteor.users.SEEN_BY.NOTI);
    const topic = Topics.findOne(topicId);
    const oldLastSeenInfo = this.lastSeens[seenType][topic._id];
    const newLastSeenInfo = { timestamp: new Date(), commentCounter: topic.commentCounter };
    if (oldLastSeenInfo && oldLastSeenInfo.commentCounter === newLastSeenInfo.commentCounter) return; // this avoids infinite loop
    const modifier = {};
    modifier['$set'] = {};
    // When user seen it by EYES, it implies no NOTI needed - so lastSeen info propagates upwards (SEEN_BY.EYES=0, SEEN_BY.NOTI=1)
    for (let i = seenType; i <= Meteor.users.SEEN_BY.NOTI; i++) {
      modifier['$set']['lastSeens.' + i + '.' + topic._id] = newLastSeenInfo;
    }

    updateCall({ userId: this._id }, { _id: this._id, modifier });
  },
});
