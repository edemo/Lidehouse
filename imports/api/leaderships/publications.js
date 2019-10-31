/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Leaderships } from './leaderships.js';

Meteor.publishComposite('leaderships.inCommunity', function leadershipsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOne(this.userId);

  return {
    find() {
      if (user.hasPermission('leaderships.inCommunity', communityId)) {
        return Leaderships.find({ communityId });
      }
      return this.ready();
    },
  };
});
