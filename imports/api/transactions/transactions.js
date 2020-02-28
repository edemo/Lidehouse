import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import rusdiff from 'rus-diff';

import { debugAssert } from '/imports/utils/assert.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Clock } from '/imports/utils/clock.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { autoformOptions } from '/imports/utils/autoform.js';
import { AccountSchema, LocationTagsSchema } from '/imports/api/transactions/account-specification.js';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Balances } from '/imports/api/transactions/balances/balances.js';
import { PeriodBreakdown } from '/imports/api/transactions/breakdowns/period.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';

export const Transactions = new Mongo.Collection('transactions');

Transactions.categoryValues = ['bill', 'payment', 'receipt', 'barter', 'transfer', 'opening', 'freeTx'];

Transactions.entrySchema = new SimpleSchema([
  AccountSchema,
  LocationTagsSchema,
  { amount: { type: Number, optional: true } },
  // A tx leg can be directly associated with a bill, for its full amount (if a tx is associated to multiple bills, use legs for each association, one leg can belong to one bill)
  // { billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true } },
  // { paymentId: { type: Number, decimal: true, optional: true } }, // index in the bill payments array
]);

Transactions.coreSchema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  category: { type: String, allowedValues: Transactions.categoryValues, autoform: { omit: true } },
  valueDate: { type: Date },
  amount: { type: Number, decimal: true },
  defId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
//  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // originating transaction (by posting rule)
//  batchId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // if its part of a Batch
//  year: { type: Number, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getFullYear(); },
//  },
//  month: { type: String, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getMonth() + 1; },
//  },
  status: { type: String, defaultValue: 'draft', allowedValues: ['draft', 'posted', 'void'], autoform: { omit: true } },
  postedAt: { type: Date, optional: true, autoform: { omit: true } },
  seId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
};

Transactions.partnerSchema = new SimpleSchema({
  relation: { type: String, allowedValues: Partners.relationValues, autoform: { omit: true } },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: choosePartner },
  membershipId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  contractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseContract }, // ?? overriding LocationTags
});

Transactions.legsSchema = {
  debit: { type: [Transactions.entrySchema], optional: true },
  credit: { type: [Transactions.entrySchema], optional: true },
  complete: { type: Boolean, optional: true, autoform: { omit: true } },  // calculated in hooks
};

Transactions.noteSchema = {
  note: { type: String, optional: true, autoform: { rows: 3 } },
};

Transactions.baseSchema = new SimpleSchema([
  Transactions.coreSchema,
  Transactions.legsSchema,
  Transactions.noteSchema,
]);

Transactions.idSet = ['communityId', 'ref'];

Meteor.startup(function indexTransactions() {
  Transactions.ensureIndex({ communityId: 1, complete: 1, valueDate: -1 });
  Transactions.ensureIndex({ seId: 1 });
  Transactions.ensureIndex({ partnerId: 1 }, { sparse: true });
  Transactions.ensureIndex({ membershipId: 1 }, { sparse: true });
  if (Meteor.isClient && MinimongoIndexing) {
    Transactions._collection._ensureIndex('relation');
  } else if (Meteor.isServer) {
    Transactions._ensureIndex({ communityId: 1, category: 1, relation: 1, serial: 1 });
    Transactions._ensureIndex({ communityId: 1, serialId: 1 });
    Transactions._ensureIndex({ 'bills.id': 1 }, { sparse: true });
    Transactions._ensureIndex({ 'debit.account': 1 }, { sparse: true });
    Transactions._ensureIndex({ 'credit.account': 1 }, { sparse: true });
  }
});

// A *transaction* is effecting a certain field (in pivot tables) with the *amount* of the transaction,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

Transactions.oppositeSide = function oppositeSide(side) {
  if (side === 'debit') return 'credit';
  if (side === 'credit') return 'debit';
  return undefined;
};

Transactions.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  partner() {
    if (this.partnerId) return Partners.findOne(this.partnerId);
    return this.partnerName;
  },
  membership() {
    if (this.membershipId) return Memberships.findOne(this.membershipId);
    return undefined;
  },
  contract() {
    return Contracts.findOne(this.contractId);
  },
  txdef() {
    if (this.defId) return Txdefs.findOne(this.defId);
    return undefined;
  },
  entityName() {
    return this.category;
  },
  getSide(side) {
    debugAssert(side === 'debit' || side === 'credit');
    return this[side] || [];
  },
  relationAccount() {
    const communityId = this.communityId;
    const name = (this.relation + 's').capitalize();
    return Accounts.findOne({ communityId, name });
  },
  conteerSide() {
    if (this.relation === 'supplier') return 'debit';
    else if (this.relation === 'customer' || this.relation === 'member') return 'credit';
    debugAssert(false, 'No such relation ' + this.relation); return undefined;
  },
  relationSide() {
    if (this.relation === 'supplier') return 'credit';
    else if (this.relation === 'customer' || this.relation === 'member') return 'debit';
    debugAssert(false, 'No such relation ' + this.relation); return undefined;
  },
  isPosted() {
//    return !!(this.debit && this.credit && this.complete); // calculateComplete()
    return !!(this.postedAt);
  },
  isReconciled() {
    return (!!this.seId);
  },
  hasOutstanding() {
    return (!!this.outstanding);
  },
  reconciledEntry() {
    return this.seId && StatementEntries.findOne(this.seId);
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
  checkAccountsExist() {
    if (this.debit) this.debit.forEach(entry => Accounts.checkExists(this.communityId, entry.account));
    if (this.credit) this.credit.forEach(entry => Accounts.checkExists(this.communityId, entry.account));
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
  subjectiveAmount() {
    let sign = 0;
    switch (this.category) {
      case 'bill':
      case 'receipt': sign = -1; break;
      case 'payment': sign = +1; break;
      default: debugAssert(false);
    }
    return sign * this.amount;
  },
  negator() {
    const tx = JSON.parse(JSON.stringify(this));
    delete tx._id;
    tx.note = 'STORNO ' + tx.serialId;
    tx.amount *= -1;
    if (tx.lines) tx.lines.forEach(l => l.quantity *= -1);  // 'bill' have lines
    if (tx.bills) tx.bills.forEach(l => l.amount *= -1);  // 'payment' have bills
//    tx.debit.forEach(l => l.amount *= -1);
//    tx.credit.forEach(l => l.amount *= -1);
    const temp = tx.credit; tx.credit = tx.debit; tx.debit = temp;
    return tx;
  },
  updateBalances(directionSign = 1) {
  //    if (!doc.complete) return;
    const communityId = this.communityId;
    this.journalEntries().forEach((entry) => {
      const leafTag = 'T-' + moment(entry.valueDate).format('YYYY-MM');
  //      entry.account.parents().forEach(account => {
      const account = entry.account;
      const localizer = entry.localizer;
      PeriodBreakdown.parentsOf(leafTag).forEach((tag) => {
        const changeAmount = entry.amount * directionSign;
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
  },
  updateOutstandings() {
    // NOP -- will be overwritten in the categories
  },
  makeJournalEntries() {
    // NOP -- will be overwritten in the categories
  },
  // bill/receipt helpers
  issuer() {
    if (this.relation === 'supplier') return this.partner();
    return this.community().asPartner();
  },
  receiver() {
    if (this.relation === 'customer') return this.partner();
    if (this.relation === 'member') return this.membership();
    return this.community().asPartner();
  },
  lineCount() {
    return this.lines.length;
  },
  matchingTxSide() {
    if (this.relation === 'supplier') return 'debit';
    else if (this.relation === 'customer' || this.relation === 'member') return 'credit';
    debugAssert(false, 'unknown relation');
    return undefined;
  },
  otherTxSide() {
    return Transactions.oppositeSide(this.matchingTxSide());
  },
  hasConteerData() {
    let result = true;
    this.lines.forEach(line => { if (line && !line.account) result = false; });
    return result;
  },
  autofillLines() {
    if (!this.lines || !this.lines.length) return;
    let totalAmount = 0;
    let totalTax = 0;
    this.lines.forEach(line => {
      if (!line) return; // can be null, when a line is deleted from the array
      line.amount = Math.round(line.unitPrice * line.quantity);
      line.tax = Math.round((line.amount * line.taxPct) / 100);
      line.amount += line.tax; // =
      totalAmount += line.amount;
      totalTax += line.tax;
    });
    this.amount = totalAmount;
    this.tax = totalTax;
  },
});

Transactions.attachBaseSchema(Transactions.baseSchema);
Transactions.attachBehaviour(Timestamped);
Transactions.attachBehaviour(SerialId(['category', 'relation', 'side']));

Transactions.attachVariantSchema(undefined, { selector: { category: 'freeTx' } });

Meteor.startup(function attach() {
  Transactions.simpleSchema({ category: 'freeTx' }).i18n('schemaTransactions');
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

// --- Before/after actions ---

function modifierChangesField(modifier, fields) {
  let result = false;
  function checkOperator(operator) {
    _.each(operator, (value, key) => {
      if (_.contains(fields, key)) result = true;
    });
  }
  checkOperator(modifier.$set);
  checkOperator(modifier.$sunset);
  checkOperator(modifier.$inc);
  return result;
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
    tdoc.checkAccountsExist();
    tdoc.complete = tdoc.calculateComplete();
    tdoc.autofillLines();
    if (tdoc.category === 'bill' || tdoc.category === 'payment') {
      tdoc.outstanding = tdoc.calculateOutstanding();
    }
    _.extend(doc, tdoc);
  });

  Transactions.after.insert(function (userId, doc) {
    const tdoc = this.transform();
    tdoc.updateBalances(+1);
    if (tdoc.category === 'payment') tdoc.registerOnBill();
    tdoc.updateOutstandings(+1);
  });

  Transactions.before.update(function (userId, doc, fieldNames, modifier, options) {
    autoValueUpdate(doc, modifier, 'complete', d => d.calculateComplete());
    if (doc.category === 'bill' || doc.category === 'receipt') {
      const newDoc = Transactions._transform(_.extend({ category: doc.category }, modifier.$set));
      if (newDoc.lines) newDoc.autofillLines();
      _.extend(modifier, { $set: newDoc });
      if ((doc.category === 'bill' && (newDoc.lines || newDoc.payments))
        || (doc.category === 'payment' && newDoc.bills)) {
        autoValueUpdate(doc, modifier, 'outstanding', d => d.calculateOutstanding());
      }
    }
  });

  Transactions.after.update(function (userId, doc, fieldNames, modifier, options) {
//    const tdoc = this.transform();
//    tdoc.checkAccountsExist();
    if (modifierChangesField(modifier, ['debit', 'credit', 'amount', 'valueDate'])) {
      const oldDoc = Transactions._transform(this.previous);
      const newDoc = Transactions._transform(doc);
      oldDoc.updateBalances(-1);
      newDoc.updateBalances(+1);
      oldDoc.updateOutstandings(-1);
      newDoc.updateOutstandings(+1);
    }
  });

  Transactions.after.remove(function (userId, doc) {
    const tdoc = this.transform();
    tdoc.updateBalances(-1);
    tdoc.updateOutstandings(-1);
    if (tdoc.seId) StatementEntries.update(tdoc.seId, { $unset: { txId: 0 } });
  });
}

//  Transactions.after.update(function (userId, doc, fieldNames, modifier, options) {

//    const tdoc = this.transform();
//--------------------
//  Could do this with rusdiff in a before.update
//    let newDoc = rusdiff.clone(doc);
//    if (modifier) rusdiff.apply(newDoc, modifier);
//    newDoc = Transactions._transform(newDoc);
//    const outstanding = newDoc.calculateOutstanding();
//--------------------
//    if ((modifier.$set && modifier.$set.payments) || (modifier.$push && modifier.$push.payments)) {
//      if (!modifier.$set || modifier.$set.outstanding === undefined) { // avoid infinite update loop!
//        Transactions.update(doc._id, { $set: { outstanding: tdoc.calculateOutstanding() } });
//      }
//    }

// --- Factory ---

Factory.define('transaction', Transactions, {
  valueDate: () => Clock.currentDate(),
  debit: [],
  credit: [],
});

Factory.define('freeTx', Transactions, {
  valueDate: () => Clock.currentDate(),
  category: 'freeTx',
  debit: [],
  credit: [],
});

// ------------------- Publications utility

function withSubs(code) {
  return code[0] === '\\' ? new RegExp(code.split('\\')[1]) : code;
}

function dateFilter(begin, end) {
  return {
    $gte: moment(begin).toDate(),
    $lt: moment(end).add(1, 'day').toDate(),
  };
}

Transactions.makeFilterSelector = function makeFilterSelector(params) {
  const selector = _.clone(params);
  selector.valueDate = dateFilter(params.begin, params.end);
  delete selector.begin; delete selector.end;
  if (params.defId) {
  } else delete selector.defId;
  if (params.account) {
    const account = withSubs(params.account);
    selector.$or = [{ 'credit.account': account }, { 'debit.account': account }];
    delete selector.account;
  } else delete selector.account;
  if (params.localizer) {
    const localizer = withSubs(params.localizer);
    selector.$or = [{ 'credit.localizer': localizer }, { 'debit.localizer': localizer }];
    delete selector.localizer;
  } else delete selector.localizer;
  if (params.debitAccount) {
    const debitAccount = withSubs(params.debitAccount);
    selector['debit.account'] = debitAccount;
    delete selector.debitAccount;
  } else delete selector.debitAccount;
  if (params.creditAccount) {
    const creditAccount = withSubs(params.creditAccount);
    selector['credit.account'] = creditAccount;
    delete selector.creditAccount;
  } else delete selector.creditAccount;
  return selector;
};

JournalEntries.makeFilterSelector = function makeFilterSelector(params) {
  const selector = _.clone(params);
  selector.valueDate = dateFilter(params.begin, params.end);
  delete selector.begin; delete selector.end;
  if (params.account) selector.account = withSubs(params.account);
  if (params.localizer) selector.localizer = withSubs(params.localizer);
  return selector;
};
