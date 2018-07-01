import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Timestamps } from '/imports/api/timestamps.js';
import { autoformOptions } from '/imports/utils/autoform.js';

export const Journals = new Mongo.Collection('journals');

Journals.phaseValues = ['done', 'plan'];

Journals.baseSchema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  phase: { type: String, defaultValue: 'done', allowedValues: Journals.phaseValues, autoform: autoformOptions(Journals.phaseValues) },
  valueDate: { type: Date },
  year: { type: Number, autoValue() { return this.field('valueDate').value.getFullYear(); }, optional: true, autoform: { omit: true } },
  month: { type: Number, autoValue() { return this.field('valueDate').value.getMonth() + 1; }, optional: true, autoform: { omit: true } },
  amount: { type: Number },
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
});

Journals.legSchema = new SimpleSchema({
  amount: { type: Number, optional: true },
  move: { type: String, allowedValues: ['from', 'to'] },
  account: { type: Object, blackbox: true },
    // rootAccountName -> leafAccountName or parcelNo
});

Journals.schema = new SimpleSchema([
  Journals.baseSchema, {
    legs: { type: Array },
    'legs.$': { type: Journals.legSchema },
  },
]);

// A *journal* is effecting a certain field (in pivot tables) with the *amount* of the journal,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the phase (done => +1, bill, plan => -1)
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

Journals.helpers({
  separateLegs() {
    const separateLegs = [];
    this.legs.forEach(leg => {
      const txBase = _.clone(this);
      delete txBase._id;
      delete txBase.legs;
      separateLegs.push(_.extend(txBase, leg));
    });
    return separateLegs;
  },
});

Journals.attachSchema(Journals.schema);
Journals.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Journals.simpleSchema().i18n('schemaJournals');
});

// Deny all journal updates - we manipulate transactions only
Journals.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
