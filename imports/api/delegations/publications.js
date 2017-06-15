/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Delegations } from './delegations.js';

Meteor.publishComposite('delegations.ofUser', function delegationsOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;

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
