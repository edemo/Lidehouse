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
      return Delegations.find({ sourcePersonId: userId });
    },

    children: [{
      find(delegation) {
        return Meteor.users.find({ _id: delegation.targetPersonId }, { fields: Meteor.users.publicFields });
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
      return Delegations.find({ targetPersonId: userId });
    },

    children: [{
      find(delegation) {
        return Meteor.users.find({ _id: delegation.sourcePersonId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});

Meteor.publish('delegations.inCommunity', function delegationsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('delegations.inCommunity', communityId)) {
    this.ready();
    return;
  }

  return Delegations.find({ communityId });
});
