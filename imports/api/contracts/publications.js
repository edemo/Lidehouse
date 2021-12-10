/* eslint-disable prefer-arrow-callback */
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Partners } from '/imports/api/partners/partners.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
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

Meteor.publishComposite('contracts.ofSelf', function contractsOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);
  if (!this.userId) return this.ready();
  const { communityId } = params;
  return {
    find() {
      return Partners.find({ communityId, userId: this.userId });
    },
    children: [{
      find(partner) {
        return Contracts.find({ communityId, partnerId: partner._id });
      },
    }, {
      find(partner) {
        return Balances.find({ communityId, partner: new RegExp('^' + partner._id) });
      },
    }],
  };
});
