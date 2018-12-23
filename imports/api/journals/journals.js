import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Timestamps } from '/imports/api/timestamps.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { AccountInputSchema } from './account-specification.js';

export const Journals = new Mongo.Collection('journals');

Journals.phaseValues = ['done', 'plan'];

Journals.entryDbSchema = new SimpleSchema({
  amount: { type: Number, optional: true },
  account: { type: Object, blackbox: true },
    // rootAccountName -> leafAccountName or parcelNo
});

Journals.entryAfSchema = new SimpleSchema({
  amount: { type: Number, optional: true },
  account: { type: AccountInputSchema },
});

Journals.rawSchema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // originating journal (by posting rule)
  batchId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // if its part of a Batch
  phase: { type: String, defaultValue: 'done', allowedValues: Journals.phaseValues, autoform: autoformOptions(Journals.phaseValues) },
  valueDate: { type: Date },
  year: { type: Number, autoValue() { return this.field('valueDate').value.getFullYear(); }, optional: true, autoform: { omit: true } },
  month: { type: Number, autoValue() { return this.field('valueDate').value.getMonth() + 1; }, optional: true, autoform: { omit: true } },
  amount: { type: Number },
};

Journals.noteSchema = {
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
};

Journals.schema = new SimpleSchema([
  _.clone(Journals.rawSchema),
  { credit: { type: [Journals.entryDbSchema] } },
  { debit: { type: [Journals.entryDbSchema] } },
  _.clone(Journals.noteSchema),
]);

Journals.inputSchema = new SimpleSchema([
  _.clone(Journals.rawSchema),
  { credit: { type: [Journals.entryAfSchema] } },
  { debit: { type: [Journals.entryAfSchema] } },
  _.clone(Journals.noteSchema),
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
  isOld() {
    const now = moment(new Date());
    const elapsed = moment.duration(now.diff(moment(this.CreatedAt)), 'hours');
    return (elapsed > 24);
  },
  journalEntries() {
    const entries = [];
    this.debit.forEach(l => {
      const txBase = _.clone(this);
      delete txBase._id;
      delete txBase.credit;
      delete txBase.debit;
      entries.push(_.extend(txBase, l, { move: 'debit' }));
    });
    this.credit.forEach(l => {
      const txBase = _.clone(this);
      delete txBase._id;
      delete txBase.credit;
      delete txBase.debit;
      entries.push(_.extend(txBase, l, { move: 'credit' }));
    });
    return entries;
  },
  negator() {
    const tx = _.clone(this);
    delete tx._id;
    tx.amount *= -1;
    tx.credit.forEach(l => l.amount *= -1);
    tx.debit.forEach(l => l.amount *= -1);
    return tx;
  },
  oppositor() {
    const tx = _.clone(this);
    delete tx._id;
    tx.credit = this.debit;
    tx.debit = this.credit;
    return tx;
  },
});

Journals.attachSchema(Journals.schema);
Journals.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Journals.simpleSchema().i18n('schemaJournals');
  Journals.inputSchema.i18n('schemaJournals');
});

// Deny all journal updates - we manipulate transactions only
Journals.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
