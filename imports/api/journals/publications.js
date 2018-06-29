/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from './journals.js';
// import { Txs } from './txs.js';
// import { TxDefs } from './tx-defs.js';

Meteor.publish('journals.inCommunity', function journalsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    this.ready();
    return;
  }
  return Journals.find({ communityId });
});

/*
Meteor.publish('txs.inCommunity', function txsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    this.ready();
    return;
  }
  return Txs.find({ communityId });
});

Meteor.publish('txDefs.inCommunity', function txDefsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;
  // Checking permissions for visibilty
  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('journals.inCommunity', communityId)) {
    this.ready();
    return;
  }
  return TxDefs.find({ communityId });
});
*/
