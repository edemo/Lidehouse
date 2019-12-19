/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Contracts } from './contracts.js';

Meteor.publish('contracts.inCommunity', function contractsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('contracts.inCommunity', { communityId })) {
    return this.ready();
  }

  return Contracts.find({ communityId });
});
