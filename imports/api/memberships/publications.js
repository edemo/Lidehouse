/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Memberships } from './memberships.js';
import { Communities } from '../communities/communities.js';

Meteor.publishComposite('memberships.ofUser', function communitiesOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;
  const user = Meteor.users.findOne(userId);
  const userEmail = user.emails[0].address;

  return {
    find() {
      return Memberships.find({ $or: [{ 'person.userId': userId }, { 'person.userEmail': userEmail }] });
    },

    children: [{
      find(membership) {
        const communityId = membership.communityId;
       // const user = Meteor.users.findOne(this.userId);
       // const visibleFields = user.hasPermission('finances.view') ? {} : { finances: 0 };
        return Communities.find({ _id: communityId } /* , { fields: visibleFields } */);
      },
    }],
  };
});
