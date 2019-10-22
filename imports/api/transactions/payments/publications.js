/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Bills } from '../bills/bills.js';
import { Payments } from './payments.js';

Meteor.publish('payments.ofBill', function paymentsOfBill(params) {
  new SimpleSchema({
    billId: { type: String },
  }).validate(params);
  const { billId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  const bill = Bills.findOne(billId);
  if (!user.hasPermission('payments.inCommunity', bill.communityId)) {
    return this.ready();
  }
  return Payments.find({ _id: { $in: bill.payments } });
});

Meteor.publish('payments.unreconciled', function paymentsUnreconciled(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('payments.inCommunity', communityId)) {
    return this.ready();
  }
  return Payments.find({ communityId, reconciledId: { $exists: false } });
});
