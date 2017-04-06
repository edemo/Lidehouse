/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Members } from '../members.js';

Meteor.publish('members.ofUser', function membersOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
  }).validate(params);

  const { userId } = params;

  return Members.find({ userId }, {
    fields: Members.publicFields,
  });
});

Meteor.publish('members.inCommunity', function membersInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  return Members.find({ communityId }, {
    fields: Members.publicFields,
  });
});
