/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Notifications } from '/imports/api/notifications/notifications.js';

// Everyone has access to all of his own stuff automatically
Meteor.publishComposite(null, function self() {
  return {
    find() {
      return Meteor.users.find({ _id: this.userId });
    },
    children: [{
      find(user) {
        return Notifications.find({ userId: user._id });
      },
    }],
  };
});

Meteor.publish('users.byId', function usersbyId(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
    userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { communityId, userId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('memberships.inCommunity', { communityId })) {
    this.ready();
    return undefined;
  }

  const userInCommunity = Memberships.findOneActive({ communityId, userId });
  if (!userInCommunity) {
    this.ready();
    return undefined;
  }

  return Meteor.users.find({ _id: userId }, { fields: Meteor.users.publicFields });
});
