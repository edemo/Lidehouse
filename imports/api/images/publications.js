/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Topics } from '/imports/api/topics/topics.js';
import { Images } from './shareddocs.js';

Meteor.publish('images.ofCommunity', function (params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  const { communityId } = params;
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('images.download', communityId)) {
    this.ready();
    return undefined;
  }

  return Images.find({ communityId });
});
