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
  if (user.hasPermission('contracts.inCommunity', { communityId })) {
    const fields = user.hasPermission('partners.details', { communityId }) ? {} : Contracts.publicFields;
    return Contracts.find({ communityId }, { fields });
  } // Otherwise, only the active leaders of the community can be seen
  return this.ready();
});
