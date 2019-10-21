import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import rusdiff from 'rus-diff';

import { debugAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { AccountSchema } from '/imports/api/transactions/account-specification.js';
import { JournalEntries } from '/imports/api/transactions/entries.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { PeriodBreakdown } from './breakdowns/breakdowns-utils.js';

export const Transactions = new Mongo.Collection('transactions');

Transactions.entrySchema = new SimpleSchema([
  AccountSchema,
  { amount: { type: Number, optional: true } },
  // A tx leg can be directly associated with a bill, for its full amount (if a tx is associated to multiple bills, use legs for each association, one leg can belong to one bill)
  { billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true } },
  { paymentId: { type: Number, decimal: true, optional: true } }, // index in the bill payments array
]);

Transactions.baseSchema = {
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },  // We explicitly use the same _id for the Bill and the corresponding Tx
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  type: { type: String, allowedValues: ['Bills', 'Payments'], optional: true, autoform: { omit: true } },
//  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // originating transaction (by posting rule)
//  batchId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // if its part of a Batch
  valueDate: { type: Date },
  amount: { type: Number },
//  year: { type: Number, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getFullYear(); },
//  },
//  month: { type: String, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getMonth() + 1; },
//  },
};

Transactions.noteSchema = {
  partner: { type: String, optional: true },
  ref: { type: String, optional: true },
  note: { type: String, optional: true },
};

Transactions.schema = new SimpleSchema([
  _.clone(Transactions.baseSchema), {
    debit: { type: [Transactions.entrySchema], optional: true },
    credit: { type: [Transactions.entrySchema], optional: true },
    complete: { type: Boolean, optional: true, autoform: { omit: true } },  // calculated in hooks
    reconciled: { type: Boolean, defaultValue: false, autoform: { omit: true } },
  },
  _.clone(Transactions.noteSchema),
]);

Transactions.idSet = ['communityId', 'ref'];

Meteor.startup(function indexTransactions() {
  Transactions.ensureIndex({ communityId: 1, complete: 1, valueDate: -1 });
  if (Meteor.isServer) {
    Transactions._ensureIndex({ 'debit.account': 1 });
    Transactions._ensureIndex({ 'credit.account': 1 });
  }
});

// A *transaction* is effecting a certain field (in pivot tables) with the *amount* of the transaction,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

export function oppositeSide(side) {
  if (side === 'debit') return 'credit';
  if (side === 'credit') return 'debit';
  return undefined;
}

Transactions.helpers({
  getSide(side) {
    debugAssert(side === 'debit' || side === 'credit');
    return this[side] || [];
  },
  isSolidified() {
    const now = moment(new Date());
    const creationTime = moment(this.createdAt);
    const elapsedHours = now.diff(creationTime, 'hours');
    return (elapsedHours > 24);
  },
  calculateComplete() {
    let total = 0;
    if (!this.debit || !this.credit) return false;
    if (!this.debit.length || !this.credit.length) return false;
    this.debit.forEach((entry) => { if (entry.account) total += entry.amount || this.amount; });
    this.credit.forEach((entry) => { if (entry.account) total -= entry.amount || this.amount; });
    return total === 0;
  },
  journalEntries() {
    const entries = [];
    if (this.debit) {
      this.debit.forEach(l => {
        const txBase = _.clone(this);
        delete txBase._id;
        delete txBase.debit;
        delete txBase.credit;
        entries.push(_.extend(txBase, l, { side: 'debit' }));
      });
    }
    if (this.credit) {
      this.credit.forEach(l => {
        const txBase = _.clone(this);
        delete txBase._id;
        delete txBase.debit;
        delete txBase.credit;
        entries.push(_.extend(txBase, l, { side: 'credit' }));
      });
    }
    return entries.map(JournalEntries._transform);
  },
  negator() {
    const tx = _.clone(this);
    delete tx._id;
    tx.amount *= -1;
    tx.debit.forEach(l => l.amount *= -1);
    tx.credit.forEach(l => l.amount *= -1);
    return tx;
  },
  oppositor() {
    const tx = _.clone(this);
    delete tx._id;
    tx.debit = this.credit;
    tx.credit = this.debit;
    return tx;
  },
});

Transactions.attachSchema(Transactions.schema);
Transactions.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Transactions.simpleSchema().i18n('schemaTransactions');
});

// --- Before/after actions ---

function checkBalances(docs) {
  const affectedAccounts = [];
  let communityId;
  docs.forEach((doc) => {
    doc.journalEntries().forEach((entry) => {
      affectedAccounts.push(entry.account);
      communityId = entry.communityId;
    });
  });
  _.uniq(affectedAccounts).forEach((account) => {
    Balances.checkCorrect({ communityId, account, tag: 'T' });
  });
}

function updateBalances(doc, revertSign = 1) {
//    if (!doc.complete) return;
  doc = Transactions._transform(doc);
  const communityId = doc.communityId;
  doc.journalEntries().forEach((entry) => {
    const leafTag = `T-${entry.valueDate.getFullYear()}-${entry.valueDate.getMonth() + 1}`;
//      const coa = ChartOfAccounts.get(communityId);
//      coa.parentsOf(entry.account).forEach(account => {
    const account = entry.account;
    const localizer = entry.localizer;
    PeriodBreakdown.parentsOf(leafTag).forEach((tag) => {
      const changeAmount = entry.amount * revertSign;
      function increaseBalance(selector, side, amount) {
        const bal = Balances.findOne(selector);
        const balId = bal ? bal._id : Balances.insert(selector);
        const incObj = {}; incObj[side] = amount;
        Balances.update(balId, { $inc: incObj });
      }
      increaseBalance({ communityId, account, tag }, entry.side, changeAmount);
      if (localizer) {
        increaseBalance({ communityId, account, localizer, tag }, entry.side, changeAmount);
      }
    });
  });
  // checkBalances([doc]);
}

function autoValueUpdate(doc, modifier, fieldName, autoValue) {
  let newDoc = rusdiff.clone(doc);
  if (modifier) rusdiff.apply(newDoc, modifier);
  newDoc = Transactions._transform(newDoc);
  modifier.$set = modifier.$set || {};
  modifier.$set[fieldName] = autoValue(newDoc);
}

if (Meteor.isServer) {
  Transactions.before.insert(function (userId, doc) {
    const tdoc = this.transform();
    doc.complete = tdoc.calculateComplete();
  });

  Transactions.after.insert(function (userId, doc) {
    updateBalances(doc, 1);
  });

  Transactions.before.update(function (userId, doc, fieldNames, modifier, options) {
    updateBalances(doc, -1);
    autoValueUpdate(doc, modifier, 'complete', doc => doc.calculateComplete());
  });

  Transactions.after.update(function (userId, doc, fieldNames, modifier, options) {
    updateBalances(doc, 1);
  });

  Transactions.after.remove(function (userId, doc) {
    updateBalances(doc, -1);
  });
}

// --- Factory ---

Factory.define('tx', Transactions, {
  valueDate: () => Clock.currentDate(),
  debit: [],
  credit: [],
});
