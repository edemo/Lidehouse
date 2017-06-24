/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// import { Memberships } from './memberships.js';
// import { Communities } from '../communities/communities.js';
import { Parcels } from '../parcels/parcels.js';

Meteor.publish('parcels.inCommunity', function parcelsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);

  const { communityId } = params;

  return Parcels.find({ communityId });
});
