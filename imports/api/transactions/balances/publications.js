/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Balances } from './balances.js';

Meteor.publish('balances.inCommunity', function balancesInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    accounts: { type: [String], optional: true },
    partners: { type: [String], optional: true }, // [] means get all, missing means don't need partner balances
    localizers: { type: [String], optional: true }, // [] means get all, missing means don't need localized balances
    tags: { type: [String], optional: true },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('balances.inCommunity', { communityId })) {
    return this.ready();
  }
  const selector = { communityId };
  if (params.accounts) selector.account = { $in: params.accounts };
  if (params.tags) selector.tag = { $in: params.tags };
  if (params.localizers) {
    if (params.localizers.length) selector.localizer = { $in: params.localizers };
    else selector.localizer = { $exists: true };
  } else selector.localizer = { $exists: false };
  if (params.partners) {
    if (params.partners.length) selector.partner = { $in: params.partners };
    else selector.partner = { $exists: true };
  } else selector.partner = { $exists: false };
  return Balances.find(selector);
});

/*
// Publishing the balances of all individual Parcels
Meteor.publishComposite('balances.ofLocalizers', function balancesOfLocalizers(params) {
  new SimpleSchema({
    communityId: { type: String },
    tag: { type: String, optional: true },
  }).validate(params);
  const { communityId, tag } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('balances.inCommunity', { communityId })) {
    return this.ready();
  }

  return {
    find() {
      return Balances.find({ communityId, localizer: { $exists: true }, tag });
    },
    children: [{
      find(balance) {
        return Parcels.find({ communityId, code: balance.localizer });
      },
    }],
  };
});

// Everyone has access to all of his own parcels' balances
Meteor.publishComposite('balances.ofSelf', function balancesOfSelf(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const parcelCodes = user.ownedParcels(communityId).map(p => Localizer.parcelRef2code(p.ref));

  return {
    find() {
      return Balances.find({ communityId, localizer: { $in: parcelCodes }, tag: 'T' });
    },
    children: [{
      find(balance) {
        return Parcels.find({ communityId, ref: Localizer.code2parcelRef(balance.localizer) });
      },
    }],
  };
});
*/
