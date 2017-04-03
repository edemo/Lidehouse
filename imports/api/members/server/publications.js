/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';

import { Members } from '../members.js';

Meteor.publish('members.inCommunity', function membersInCommunity() {
  return Members.find({}, {
    fields: Members.publicFields,
  });
});
