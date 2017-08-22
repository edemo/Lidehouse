/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Delegations } from './delegations.js';

Meteor.publishComposite('delegations.fromUser', function delegationsFromUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);
  const { userId } = params;

  if (userId !== this.userId) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `Publication: delegations.fromUser, userId: {${userId}}, this.userId: {${this.userId}}`);
  }

  return {
    find() {
      return Delegations.find({ sourceUserId: userId });
    },

    children: [{
      find(delegation) {
        return Meteor.users.find({ _id: delegation.targetUserId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});

Meteor.publishComposite('delegations.toUser', function delegationsToUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);
  const { userId } = params;

  if (userId !== this.userId) {
    throw new Meteor.Error('err_permissionDenied', 'No permission to perform this activity',
      `Publication: delegations.toUser, userId: {${userId}}, this.userId: {${this.userId}}`);
  }

  return {
    find() {
      return Delegations.find({ targetUserId: userId });
    },

    children: [{
      find(delegation) {
        return Meteor.users.find({ _id: delegation.sourceUserId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});
