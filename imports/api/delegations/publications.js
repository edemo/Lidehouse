/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
// import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Delegations } from './delegations.js';

Meteor.publishComposite(null, function delegationsFromUser() {
  const userId = this.userId;

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

Meteor.publishComposite(null, function delegationsToUser() {
  const userId = this.userId;

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
