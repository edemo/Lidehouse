/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// import { Memberships } from './memberships.js';
// import { Communities } from '../communities/communities.js';
import { Parcels } from '../parcels/parcels.js';

Meteor.publish('parcels.listing', function parcelsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.listing', communityId)) {
    this.ready();
    return;
  }
  return Parcels.find({ communityId });
});
