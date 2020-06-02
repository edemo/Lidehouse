import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { allowedOptions } from '/imports/utils/autoform.js';
import { debugAssert } from '/imports/utils/assert.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

export const Statements = new Mongo.Collection('statements');

Statements.supportedBanks = ['OTP', 'K&H'];

Statements.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  account: { type: String },
  bank: { type: String, allowedValues: Statements.supportedBanks, autoform: allowedOptions() },
  startDate: { type: Date },
  startBalance: { type: Number },
  endDate: { type: Date },
  endBalance: { type: Number },
//  entries: { type: Array },
//  'entries.$': { type: Statements.entrySchema },
  reconciled: { type: Boolean, defaultValue: false, autoform: { omit: true } },
});

Statements.helpers({
});

Meteor.startup(function indexStatements() {
  Statements.ensureIndex({ communityId: 1 });
});

Statements.attachSchema(Statements.schema);
Statements.attachBehaviour(Timestamped);

// --- Factory ---

Factory.define('statement', Statements, {
  account: '31',
  bank: 'K&H',
  startDate: moment().subtract(1, 'month').toDate(),
  endDate: new Date(),
  startBalance: 0,
  endBalance: 10000,
});
