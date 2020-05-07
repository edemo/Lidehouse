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

// Subscribes to the public fields of users in the same community
Meteor.publish('users.inCommunitybyId', function userInCommunitybyId(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;
  const communityId = _id;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('memberships.inCommunity', { communityId })) {
    this.ready(); 
    return; 
  }

  const userInCommunity = Memberships.findOneActive({ communityId, userId: _id });
  if (!userInCommunity) {
    this.ready();
    return; 
  }

  return Meteor.users.find({ _id }, { fields: Meteor.users.publicFields });
});
