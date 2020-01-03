/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Agendas } from './agendas.js';

Meteor.publish('agendas.inCommunity', function agendasInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('agendas.inCommunity', { communityId })) {
    return this.ready();
  }

  return Agendas.find({ communityId });
});
