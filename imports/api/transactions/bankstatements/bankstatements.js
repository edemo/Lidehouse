import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { autoformOptions } from '/imports/utils/autoform.js';
import { debugAssert } from '/imports/utils/assert.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { ChartOfAccounts } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';
import { Localizer } from '/imports/api/transactions/breakdowns/localizer.js';

export const Bankstatements = new Mongo.Collection('bankstatements');

Bankstatements.supportedBanks = ['K&H'];

Bankstatements.entrySchema = new SimpleSchema({
  valueDate: { type: Date },
  partner: { type: String, max: 50 },
  note: { type: String, max: 200 },
  amount: { type: Number },
  reconciled: { type: Boolean, defaultValue: false },
});

Bankstatements.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  bank: { type: String, allowedValues: Bankstatements.supportedBanks, autoform: autoformOptions(Bankstatements.supportedBanks) },
  account: { type: String },
  startDate: { type: Date },
  startBalance: { type: Number },
  endDate: { type: Date },
  endBalance: { type: Number },
  entries: { type: Array },
  'entries.$': { type: Bankstatements.entrySchema },
  reconciled: { type: Boolean, defaultValue: false, autoform: { omit: true } },
});

Bankstatements.helpers({
});

Meteor.startup(function indexBalances() {
  Bankstatements.ensureIndex({ communityId: 1 });
});

Bankstatements.attachSchema(Bankstatements.schema);
Bankstatements.attachBehaviour(Timestamped);


// --- Factory ---

Factory.define('bankstatement', Bankstatements, {
  communityId: () => Factory.get('community'),
  startDate: moment().subtract(1, 'month').toDate(),
  endDate: new Date(),
  startBalance: 0,
  endBalance: 10000,
  bank: 'K&H',
  account: '31',
  entries: [{
    valueDate: new Date(),
    partner: faker.random.word(),
    note: faker.random.word(),
    amount: 10000,
  }],
});
