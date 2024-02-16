/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from './accounts.js';
import { Communities } from '/imports/api/communities/communities.js';

Meteor.publish('accounts.inCommunity', function moneyAccountsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  const community = Communities.findOne(communityId);

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('accounts.inCommunity', { communityId })) {
    return this.ready();
  }

  return Accounts.find({ communityId: { $in: [communityId, community.settings.templateId] } }, { sort: { code: 1 } });
});
