/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Parcels } from '../parcels/parcels.js';

Meteor.publish('parcels.ofCommunity', function parcelsOfCommunity(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('parcels.inCommunity', communityId)) {
    return this.ready();
  }
  return Parcels.find({ communityId });
});
