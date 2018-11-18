/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Delegations } from './delegations.js';

// Everyone has access to all of his own stuff automatically
Meteor.publishComposite(null, function delegationsFromUser() {
  return {
    find() {
      return Delegations.find({ sourcePersonId: this.userId });
    },
    // Publish the Target User of the Delegation
    children: [{
      find(delegation) {
        return Meteor.users.find({ _id: delegation.targetPersonId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});

Meteor.publishComposite(null, function delegationsToUser() {
  return {
    find() {
      return Delegations.find({ targetPersonId: this.userId });
    },
    // Publish the Source User of the Delegation
    children: [{
      find(delegation) {
        return Meteor.users.find({ _id: delegation.sourcePersonId }, { fields: Meteor.users.publicFields });
      },
    }],
  };
});
