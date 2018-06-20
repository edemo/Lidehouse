import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Timestamps } from '/imports/api/timestamps.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const Journals = new Mongo.Collection('journals');

Journals.phaseValues = ['done', 'plan'];

Journals.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  phase: { type: String, defaultValue: 'done', allowedValues: Journals.phaseValues, autoform: autoformOptions(Journals.phaseValues) },
  valueDate: { type: Date },
  year: { type: Number, decimal: true, autoValue() { return this.field('valueDate').value.getFullYear(); }, optional: true, autoform: { omit: true } },
  month: { type: Number, decimal: true, autoValue() { return this.field('valueDate').value.getMonth() + 1; }, optional: true, autoform: { omit: true } },
  amount: { type: Number, decimal: true },
  // affected accounts
  accountFrom: { type: Object, blackbox: true, optional: true },
  accountTo: { type: Object, blackbox: true, optional: true },
    // rootAccountName -> leafAccountName or parcelNo
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
});

// A *journal* is effecting a certain field (in pivot tables) with the *amount* of the journal,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the phase (done => +1, bill, plan => -1)
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

Journals.attachSchema(Journals.schema);
Journals.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Journals.simpleSchema().i18n('schemaJournals');
});

// Deny all client-side updates since we will be using methods to manage this collection
Journals.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
