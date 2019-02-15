/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from './journals.js';
// import { Txs } from './txs.js';
// import { TxDefs } from './tx-defs.js';

Meteor.publish('journals.byId', function journalsInCommunity(params) {
  new SimpleSchema({
    _id: { type: String },
  }).validate(params);
  const { _id } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const tx = Journals.findOne(_id);
  if (!user.hasPermission('journals.inCommunity', tx.communityId)) {
    return this.ready();
  }
  return Journals.find({ _id });
});

Meteor.publish('journals.byAccount', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    localizer: { type: String, optional: true },
  }).validate(params);
  const { communityId, account, localizer } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    return this.ready();
  }
  if ((account && localizer) || (!account && !localizer)) {
    throw new Meteor.Error('invalid subscription');
  }

  const selector = { communityId };
  if (account) selector.$or = [{ 'credit.account': account }, { 'debit.account': account }];
  if (localizer) selector.$or = [{ 'credit.localizer': localizer }, { 'debit.localizer': localizer }];
  console.log('in sub', selector);
  return Journals.find(selector);
});

Meteor.publish('journals.incomplete', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    return this.ready();
  }
  return Journals.find({ communityId, complete: false });
});
