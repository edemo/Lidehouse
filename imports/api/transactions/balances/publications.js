/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Balances } from './balances.js';
import { Period } from '../periods/period.js';

Meteor.publish('balances.inCommunity', function balancesInCommunity(params) {
  new SimpleSchema({
    communityId: { type: String },
    account: { type: String, optional: true },
    accounts: { type: [String], optional: true },
    partner: { type: String, optional: true },
    partners: { type: [String], optional: true }, // [] means get all, missing means don't need partner balances
    localizer: { type: String, optional: true },
    localizers: { type: [String], optional: true }, // [] means get all, missing means don't need localized balances
    tag: { type: String, optional: true },
    tags: { type: [String], optional: true },
    notNull: { type: Boolean, optional: true }, // publish only balances with non null amount
  }).validate(params);
  const { communityId } = params;

  const user = Meteor.users.findOneOrNull(this.userId);
  if (!user.hasPermission('balances.inCommunity', { communityId })) {
    return this.ready();
  }
  const selector = { communityId };
  if (params.account) selector.account = params.account;
  else if (params.accounts) selector.account = { $in: params.accounts };
  if (params.tag) params.tags = [params.tag];
  if (params.tags) {
//  if (params.tags[0] === 'years') selector.tag = new RegExp(/^T-\d{4}$/);
//  else if (params.tags[0] === 'months') selector.tag = new RegExp(/^T-\d{4}-\d{2}$/);
    const addedTags = [];
    params.tags.forEach(t => {
      if (t.startsWith('C')) {
        addedTags.push('T' + t.substring(1));
        const period = Period.fromTag(t);
        addedTags.push('O-' + period.year);
        if (period.type() === 'year') {
          addedTags.push('O-' + period.next().year);
        } else if (period.type() === 'month') {
          for (let i = period.month; i > 0; i--) {
            const ip = Period.fromValues(period.year, i);
            const ipTag = ip.toTag();
            addedTags.push('T' + ipTag.substring(1));
          }
        }
      }
    });
    selector.tag = { $in: params.tags.concat(addedTags) };
  }
  if (params.localizer) {
    selector.localizer = params.localizer;
  } else if (params.localizers) {
    if (params.localizers.length) selector.localizer = { $in: params.localizers };
    else selector.localizer = { $exists: true };
  } else selector.localizer = { $exists: false };
  if (params.partner) {
    selector.partner = params.partner;
  } else if (params.partners) {
    if (params.partners.length) selector.partner = { $in: params.partners };
    else selector.partner = { $exists: true };
  } else selector.partner = { $exists: false };
  if (params.notNull) _.extend(selector, { $expr: { $ne: ['$debit', '$credit'] } });
//  console.log('Publishing balances', params, 'selector:', selector);
//  console.log('Initial count:', Balances.find(selector).count());
  return Balances.find(selector);
});
