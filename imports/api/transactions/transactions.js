import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { Timestamps } from '/imports/api/timestamps.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { AccountSchema } from '/imports/api/transactions/account-specification.js';
import { JournalEntries } from '/imports/api/transactions/entries.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { PeriodBreakdown } from './breakdowns/breakdowns-utils.js';

export let Transactions;
export class TransactionsCollection extends Mongo.Collection {
  insert(doc, callback) {
    const tdoc = this._transform(doc);
    const result = super.insert(doc, callback);
    this._updateBalances(tdoc);
//    this._checkBalances([tdoc]);
    return result;
  }
  update(selector, modifier, options, callback) {
    const originalDocs = this.find(selector);
    originalDocs.forEach((doc) => {
      this._updateBalances(doc, -1);
    });
    const result = super.update(selector, modifier, options, callback);
    const updatedDocs = this.find(selector);
    updatedDocs.forEach((doc) => {
      this._updateBalances(doc, 1);
    });
//    this._checkBalances(originalDocs);
    return result;
  }
  remove(selector, callback) {
    const docs = this.find(selector);
    docs.forEach((doc) => {
      this._updateBalances(doc, -1);
    });
    const result = super.remove(selector, callback);
//    this._checkBalances(docs);
    return result;
  }
  _updateBalances(doc, revertSign = 1) {
//    if (!doc.complete) return;
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
  }
  _checkBalances(docs) {
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
}

Transactions = new TransactionsCollection('transactions');

Transactions.entrySchema = new SimpleSchema([
  AccountSchema,
  { amount: { type: Number, optional: true } },
]);

Transactions.baseSchema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // originating transaction (by posting rule)
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

Transactions.noteSchema = {
  partner: { type: String, optional: true },
  ref: { type: String, optional: true },
  note: { type: String, optional: true },
};

Transactions.schema = new SimpleSchema([
  _.clone(Transactions.baseSchema), {
    credit: { type: [Transactions.entrySchema], optional: true },
    debit: { type: [Transactions.entrySchema], optional: true },
    complete: { type: Boolean, autoform: { omit: true }, autoValue() {
      let total = 0;
      const amount = this.field('amount').value;
      const debits = this.field('debit').value;
      const credits = this.field('credit').value;
      if (!debits || !credits) return false;
      debits.forEach(entry => total += entry.amount || amount);
      credits.forEach(entry => total -= entry.amount || amount);
      return total === 0;
    } },
  },
  _.clone(Transactions.noteSchema),
]);

Meteor.startup(function indexTransactions() {
  Transactions.ensureIndex({ communityId: 1, complete: 1, valueDate: -1 });
});

// A *transaction* is effecting a certain field (in pivot tables) with the *amount* of the transaction,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

Transactions.helpers({
  isSolidified() {
    const now = moment(new Date());
    const creationTime = moment(this.createdAt);
    const elapsedHours = now.diff(creationTime, 'hours');
    return (elapsedHours > 24);
  },
  journalEntries() {
    const entries = [];
    if (this.debit) {
      this.debit.forEach(l => {
        const txBase = _.clone(this);
        delete txBase._id;
        delete txBase.credit;
        delete txBase.debit;
        entries.push(_.extend(txBase, l, { side: 'debit' }));
      });
    }
    if (this.credit) {
      this.credit.forEach(l => {
        const txBase = _.clone(this);
        delete txBase._id;
        delete txBase.credit;
        delete txBase.debit;
        entries.push(_.extend(txBase, l, { side: 'credit' }));
      });
    }
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

Transactions.attachSchema(Transactions.schema);
Transactions.attachSchema(Timestamps);

Meteor.startup(function attach() {
  Transactions.simpleSchema().i18n('schemaTransactions');
});
