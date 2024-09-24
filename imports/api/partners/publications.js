/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Partners } from './partners.js';

Meteor.publishComposite('partners.inCommunity', function partnersInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('partners.inCommunity', { communityId })) {
    return this.ready();
  }
  const fields = user.hasPermission('partners.details', { communityId }) ? {} : Partners.publicFields;
  return {
    find() {
      return Partners.find({ communityId }, { fields });
    },
    children: [{
      find(partner) {
        return Meteor.users.find(partner.userId);
      },
    }],
  };
});
