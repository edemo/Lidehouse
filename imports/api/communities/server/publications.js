/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Communities } from '../communities.js';
import { Members } from '../../members/members.js';

Meteor.publish('communities.listing', function communitiesListing() {
  return Communities.find({}, {
    fields: Communities.publicFields,
  });
});

Meteor.publishComposite('communities.ofUser', function communitiesOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;

  return {
    find() {
      return Members.find({ userId });
    },

    children: [{
      find(member) {
        return Communities.find({ _id: member.communityId }, { fields: Communities.publicFields });
      },
    }],
  };
});
