/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Localizers } from './localizers.js';

Meteor.publish('localizers.inCommunity', function localizersInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('localizers.inCommunity', { communityId })) {
    return this.ready();
  }

  return Localizers.find({ communityId });
});
