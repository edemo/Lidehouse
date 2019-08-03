/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Bills } from './bills.js';

Meteor.publish('bills.byId', function billsById(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const tx = Bills.findOne(_id);
  if (!user.hasPermission('bills.inCommunity', tx.communityId)) {
    return this.ready();
  }
  return Bills.find({ _id });
});

Meteor.publish('bills.filtered', function billsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    partner: { type: String, optional: true },
    account: { type: String, optional: true },
    localizer: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, partner, account, localizer, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('bills.inCommunity', communityId)) {
    return this.ready();
  }
  const selector = { communityId, partner, account, localizer, valueDate: { $gte: begin, $lt: end } };
  return Bills.find(selector);
});

Meteor.publish('bills.outstanding', function billsIncomplete(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('bills.inCommunity', communityId)) {
    return this.ready();
  }
  return Bills.find({ communityId, outstanding: { $gt: 0 } }, { $sort: { outsanding: -1 } });
});
