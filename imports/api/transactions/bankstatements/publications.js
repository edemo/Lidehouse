import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Bankstatements } from './bankstatements.js';

Meteor.publish('bankstatements.byId', function bankstatementsById(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const bs = Bankstatements.findOne(_id);
  if (!user.hasPermission('bankstatements.inCommunity', bs.communityId)) {
    return this.ready();
  }
  return Bankstatements.find({ _id });
});

Meteor.publish('bankstatements.byAccount', function bankstatementsByAccount(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    begin: { type: Date, optional: true },
    end: { type: Date, optional: true },
  }).validate(params);
  const { communityId, account, localizer, begin, end } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('bankstatements.inCommunity', communityId)) {

  const selector = { communityId, account };
  if (end) selector.beginDate = { $lte: end };
  if (begin) selector.endDate = { $gte: begin };

  return Bankstatements.find(selector);
});

Meteor.publish('bankstatements.unreconciled', function bankstatementsUnreconciled(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('bankstatements.inCommunity', communityId)) {
    return this.ready();
  }
  return Bankstatements.find({ communityId, reconciled: false });
});