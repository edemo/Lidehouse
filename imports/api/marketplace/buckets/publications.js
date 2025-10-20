/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Buckets } from './buckets.js';
import { Communities } from '/imports/api/communities/communities.js';

Meteor.publish('buckets.inCommunity', function bucketsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  const community = Communities.findOne(communityId);

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('buckets.inCommunity', { communityId })) {
    return this.ready();
  }

  return Buckets.find({ communityId: { $in: [communityId, community.settings.templateId] } }, { sort: { code: 1 } });
});
