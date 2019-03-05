import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Timestamps } from '/imports/api/timestamps.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { AccountSchema } from '/imports/api/journals/account-specification.js';
import { JournalEntries } from '/imports/api/journals/entries.js';
import { Balances } from '/imports/api/journals/balances/balances.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { PeriodBreakdown } from './breakdowns/breakdowns-utils.js';

export let Journals;
export class JournalsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const result = super.insert(doc, callback);
    if (doc.complete) {
      this._updateBalances(this._transform(doc));
    }
    return result;
  }
  update(selector, modifier, options, callback) {
    const originalDocs = this.find(selector);
    originalDocs.forEach((doc) => {
      if (doc.complete) this._updateBalances(doc, -1);
    });
    const result = super.update(selector, modifier, options, callback);
    const updatedDocs = this.find(selector);
    updatedDocs.forEach((doc) => {
      if (doc.complete) this._updateBalances(doc, 1);
    });
    return result;
  }
  remove(selector, callback) {
    const docs = this.find(selector);
    docs.forEach((doc) => {
      if (doc.complete) this._updateBalances(doc, -1);
    });
    return super.remove(selector, callback);
  }
  _updateBalances(doc, revertSign = 1) {
    const communityId = doc.communityId;
    doc.journalEntries().forEach(entry => {
      const code = `T-${entry.valueDate.getFullYear()}-${entry.valueDate.getMonth() + 1}`;
//      const coa = Breakdowns.chartOfAccounts(communityId);
//      coa.parentsOf(entry.account).forEach(account => {
      const account = entry.account;
      const localizer = entry.localizer;
      PeriodBreakdown.parentsOf(code).forEach(tag => {
        const amount = entry.effectiveAmount() * revertSign;
        function updateBalance(selector, amount) {
          const bal = Balances.findOne(selector);
          const balId = bal ? bal._id : Balances.insert(selector);
          Balances.update(balId, { $inc: { amount } });
        }
        updateBalance({ communityId, account, tag }, amount);
        if (localizer) {
          updateBalance({ communityId, account, tag, localizer }, amount);
        }
      });
    });
  }
}

Journals = new JournalsCollection('journals');

Journals.entrySchema = new SimpleSchema([
  AccountSchema,
  { amount: { type: Number, optional: true } },
]);

Journals.rawSchema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // originating journal (by posting rule)
  batchId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // if its part of a Batch
  valueDate: { type: Date },
  amount: { type: Number },
//  year: { type: Number, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getFullYear(); },
//  },
//  month: { type: String, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getMonth() + 1; },
//  },
};

Journals.noteSchema = {
  ref: { type: String, max: 100, optional: true },
  note: { type: String, max: 100, optional: true },
};

Journals.schema = new SimpleSchema([
  _.clone(Journals.rawSchema),
  { credit: { type: [Journals.entrySchema], optional: true } },
  { debit: { type: [Journals.entrySchema], optional: true } },
  { complete: { type: Boolean, autoform: { omit: true }, autoValue() {
    let total = 0;
    const amount = this.field('amount').value;
    const debits = this.field('debit').value;
    const credits = this.field('credit').value;
    if (!debits || !credits) return false;
    debits.forEach(entry => total += entry.amount || amount);
    credits.forEach(entry => total -= entry.amount || amount);
    return total === 0;
  } } },
  _.clone(Journals.noteSchema),
]);

Meteor.startup(function indexJournals() {
  Journals.ensureIndex({ communityId: 1, complete: 1, valueDate: -1 });
});

// A *journal* is effecting a certain field (in pivot tables) with the *amount* of the journal,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

Journals.helpers({
  isOld() {
    const now = moment(new Date());
    const elapsed = moment.duration(now.diff(moment(this.createdAt)), 'hours');
    return (elapsed > 24);
  },
  journalEntries() {
    const entries = [];
    this.debit.forEach(l => {
      const txBase = _.clone(this);
      delete txBase._id;
      delete txBase.credit;
      delete txBase.debit;
      entries.push(_.extend(txBase, l, { side: 'debit' }));
    });
    this.credit.forEach(l => {
      const txBase = _.clone(this);
      delete txBase._id;
      delete txBase.credit;
      delete txBase.debit;
      entries.push(_.extend(txBase, l, { side: 'credit' }));
    });
    return entries.map(JournalEntries._transform);
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
});

// Deny all journal updates - we manipulate transactions only
Journals.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
