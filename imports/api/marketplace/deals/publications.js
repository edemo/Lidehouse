/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Partners } from '/imports/api/partners/partners.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { Deals } from './deals.js';

Meteor.publish('deals.ofSelf', function dealsOfSelf() {
  return Deals.find({ participantIds: this.userId });
});

Meteor.publishComposite('deals.ofUser', function dealsOfUser(params) {
  new SimpleSchema({
    userId: { type: String },
    communityId: { type: String },
  }).validate(params);

  const { communityId, userId } = params;
  if (userId !== this.userId) return this.ready();
  const user = Meteor.users.findOne(userId);
  if (!user.hasPermission('deals.inCommunity', { communityId })) return this.ready();

  return {
    find() {
      return Deals.find({ communityId, participantIds: userId });
    },
    children: [{
      find(deal) {
        return Listings.find({ _id: deal.listingId });
      },
    }, {
      find(deal) {
        return Partners.find({ _id: { $in: [deal.partner1Id, deal.partner2Id] } });
      },
    }],
  };
});

Meteor.publish('deals.inCommunity', function dealsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('deals.inCommunity', { communityId })) {
    return this.ready();
  }
  return Deals.find({ communityId });
});
