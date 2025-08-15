/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { debugAssert } from '/imports/utils/assert.js';

import { AccountingPeriods } from './accounting-periods.js';

Meteor.publish('accountingPeriods.inCommunity', function accountingPeriodsInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('accounts.inCommunity', { communityId })) {
    return this.ready();
  }

  return AccountingPeriods.find({ communityId });
});
