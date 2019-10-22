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

export const StatementEntries = new Mongo.Collection('statementEntries');

StatementEntries.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  account: { type: String },
  valueDate: { type: Date },
  partner: { type: String, max: 50 },
  note: { type: String, max: 200 },
  amount: { type: Number },
  reconciledId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  statementId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

StatementEntries.helpers({
  isReconciled() {
    return (!!this.reconciledId);
  },
});

Meteor.startup(function indexStatements() {
  if (Meteor.isServer) {
    StatementEntries._ensureIndex({ communityId: 1, valueDate: 1 });
  }
});

StatementEntries.attachSchema(StatementEntries.schema);

// --- Factory ---

Factory.define('statementEntry', StatementEntries, {
  communityId: () => Factory.get('community'),
  account: '31',
  valueDate: new Date(),
  partner: faker.random.word(),
  note: faker.random.word(),
  amount: 10000,
});
