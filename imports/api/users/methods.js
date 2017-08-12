import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';

import { insert as insertMember } from '/imports/api/memberships/methods.js';
import './users.js';

export const invite = new ValidatedMethod({
  name: 'user.invite',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ email, communityId }) {
    const userId = Accounts.createUser({ email, password: 'initialPassword' });
      // userId supposed to be good at this point on the client, but it is NOT,
    // so I can only add the user to the community on the server side (not nice)
    if (Meteor.isServer) {
      Accounts.sendEnrollmentEmail(userId);
      insertMember.call({ userId, communityId, role: 'guest' });
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
    if (_id !== this.userId) {
      throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
        `Method: users.update, userId: ${this.userId}, _id: ${_id}`);
    }

    Meteor.users.update({ _id }, modifier);
  },
});

if (Meteor.isClient) {
  import { handleError } from '/imports/ui/lib/errors.js';

  Meteor.users.helpers({
    hasNowSeen(topic) {
      // The user has just seen this topic, so the lastseen info needs to be updated
      const oldLastSeenInfo = this.lastseens[topic._id];
      let newLastSeenInfo;
      const comments = topic.comments().fetch(); // returns newest-first order
      if (!comments || comments.length === 0) {
        newLastSeenInfo = { timestamp: null, commentCounter: 0 };
      } else {
        const lastseenTimestamp = comments[0].createdAt;
        newLastSeenInfo = { timestamp: lastseenTimestamp, commentCounter: topic.commentCounter };
      }

      if (oldLastSeenInfo && oldLastSeenInfo.commentCounter === newLastSeenInfo.commentCounter) return; // this avoids infinite loop

      const modifier = {};
      modifier['$set'] = {};
      modifier['$set']['lastseens.' + topic._id] = newLastSeenInfo;

      update.call({ _id: this._id, modifier }, handleError);
    },
  });
}
