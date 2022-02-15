import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Factory } from 'meteor/dburles:factory';
import { AutoForm } from 'meteor/aldeed:autoform';
import faker from 'faker';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert } from '/imports/utils/assert.js';
import { dateSelector } from '/imports/api/utils';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Clock } from '/imports/utils/clock.js';
import { modifierChangesField, autoValueUpdate } from '/imports/api/mongo-utils.js';
import { Noted } from '/imports/api/behaviours/noted.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { AccountSchema, LocationTagsSchema } from '/imports/api/transactions/account-specification.js';
import { JournalEntries } from '/imports/api/transactions/journal-entries/journal-entries.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { PeriodBreakdown, Period } from '/imports/api/transactions/breakdowns/period.js';
import { Relations } from '/imports/api/core/relations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { StatementEntries } from '/imports/api/transactions/statement-entries/statement-entries.js';

export const Transactions = new Mongo.Collection('transactions');

Transactions.categoryValues = ['bill', 'payment', 'receipt', 'allocation', 'barter', 'exchange', 'transfer', 'opening', 'freeTx'];
Transactions.reconciledCategories = ['payment', 'receipt', 'transfer'];

Transactions.statuses = {
  draft: { name: 'draft', color: 'warning' },
  posted: { name: 'posted', color: 'primary' },
  void: { name: 'void', color: 'danger' },
};
Transactions.statusValues = Object.keys(Transactions.statuses);

Transactions.entrySchema = new SimpleSchema([
  AccountSchema,
  LocationTagsSchema,
  { amount: { type: Number, optional: true } },
  // A tx leg can be directly associated with a bill, for its full amount (if a tx is associated to multiple bills, use legs for each association, one leg can belong to one bill)
  // { billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true } },
  // { paymentId: { type: Number, decimal: true, optional: true } }, // index in the bill payments array
]);

Transactions.partnerEntrySchema = new SimpleSchema({
  partner: { type: String },
  side: { type: String, allowedValues: ['debit', 'credit'] },
  amount: { type: Number, optional: true },
});

Transactions.coreSchema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  category: { type: String, allowedValues: Transactions.categoryValues, autoform: { type: 'hidden' } },
  valueDate: { type: Date },
  amount: { type: Number, decimal: true },
  rounding: { type: Number, decimal: true, optional: true },
  defId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
//  sourceId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // originating transaction (by posting rule)
//  batchId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } }, // if its part of a Batch
//  year: { type: Number, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getFullYear(); },
//  },
//  month: { type: String, optional: true, autoform: { omit: true },
//    autoValue() { return this.field('valueDate').value.getMonth() + 1; },
//  },
  status: { type: String, defaultValue: 'draft', allowedValues: Transactions.statusValues, autoform: { omit: true } },
  postedAt: { type: Date, optional: true, autoform: { omit: true } },
  seId: { type: [String], regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  reconciled: { type: Boolean, optional: true, autoform: { omit: true } }, // calculated in hooks
};

Transactions.partnerSchema = new SimpleSchema({
  relation: { type: String, allowedValues: Relations.values, autoform: { type: 'hidden' } },
  partnerId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { ...choosePartner } },
  contractId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { ...chooseContract } },
});

Transactions.legsSchema = {
  debit: { type: [Transactions.entrySchema], optional: true },
  credit: { type: [Transactions.entrySchema], optional: true },
  pEntries: { type: [Transactions.partnerEntrySchema], optional: true },
  complete: { type: Boolean, optional: true, autoform: { omit: true } },  // calculated in hooks
};

Transactions.baseSchema = new SimpleSchema([
  Transactions.coreSchema,
  Transactions.legsSchema,
]);

Transactions.idSet = ['communityId', 'serialId'];

Meteor.startup(function indexTransactions() {
  Transactions.ensureIndex({ communityId: 1, serialId: 1 });
  Transactions.ensureIndex({ communityId: 1, valueDate: -1 });
  Transactions.ensureIndex({ communityId: 1, reconciled: 1, valueDate: -1 });
  Transactions.ensureIndex({ seId: 1 });
  if (Meteor.isClient && MinimongoIndexing) {
    Transactions._collection._ensureIndex('relation');
  } else if (Meteor.isServer) {
    Transactions._ensureIndex({ communityId: 1, category: 1, relation: 1, serial: 1 });
    Transactions._ensureIndex({ 'bills.id': 1 }, { sparse: true });
    Transactions._ensureIndex({ 'payments.id': 1 }, { sparse: true });
    Transactions._ensureIndex({ communityId: 1, 'debit.account': 1, valueDate: -1 }, { sparse: true });
    Transactions._ensureIndex({ communityId: 1, 'credit.account': 1, valueDate: -1 }, { sparse: true });
    Transactions._ensureIndex({ communityId: 1, 'pEntries.partner': 1, valueDate: -1 }, { sparse: true });
  }
});

// A *transaction* is effecting a certain field (in pivot tables) with the *amount* of the transaction,
// but the Sign of the effect is depending on 3 components:
// - Sign of the amount field
// - Sign of the direction (in case of accounts only) if field appears in accountFrom => -1, if in accountTo => +1
// The final sign of the impact of this tx, is the multiplication of these 3 signs.
// Note: in addition the Sign of the breakdown itself (in the schema) will control how we display it, 
// and in the BIG EQUATION constraint (Assets + Expenses = Equity + Sources + Incomes + Liabilities)

Transactions.isValidSide = function isValidSide(side) {
  return (side === 'debit') || (side === 'credit');
};
Transactions.oppositeSide = function oppositeSide(side) {
  if (side === 'debit') return 'credit';
  if (side === 'credit') return 'debit';
  return undefined;
};
Transactions.signOfPartnerSide = function signOfPartnerSide(side) {
  if (side === 'debit') return +1;
  if (side === 'credit') return -1;
  return undefined;
};

Transactions.setTxdef = function setTxdef(doc, txdef) {
  doc.defId = txdef._id;
  doc.category = txdef.category;
  _.each(txdef.data, (value, key) => doc[key] = value); // set doc.relation, etc
};

Transactions.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  partner() {
    if (this.partnerId) return Partners.findOne(this.partnerId);
    return undefined;
  },
  membership() {
    if (this.membershipId) return Memberships.findOne(this.membershipId);
    return undefined;
  },
  contract() {
    if (this.contractId) return Contracts.findOne(this.contractId);
    return undefined;
  },
  partnerContractCode() {
    return Partners.code(this.partnerId, this.contractId);
  },
  txdef() {
    const Txdefs = Mongo.Collection.get('txdefs');
    if (this.defId) return Txdefs.findOne(this.defId);
    return undefined;
  },
  entityName() {
    return this.category;
  },
  amountWoRounding() {
    return this.amount - (this.rounding || 0);
  },
  getSide(side) {
    debugAssert(side === 'debit' || side === 'credit');
    return this[side] || [];
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
  relationSign() {
    return Relations.sign(this.relation);
  },
  isPosted() {
//    return !!(this.debit && this.credit && this.complete); // calculateComplete()
    return !!(this.postedAt);
  },
  needsReconcile() {
    if (this.reconciled === false) return true;
    else return false;
  },
  isSolidified() {
    const now = moment(new Date());
    const creationTime = moment(this.createdAt);
    const elapsedHours = now.diff(creationTime, 'hours');
    return (elapsedHours > 24);
  },
  isPetrified() {
    const now = moment(new Date());
    const valueDate = moment(this.valueDate);
    return now.year() - valueDate.year() > 1;
  },
  isAutoPosting() {
    return this.status === 'void' || this.txdef().isAutoPosting();
  },
  calculateComplete() {
    let total = 0;
    if (!this.debit || !this.credit) return false;
    if (!this.debit.length || !this.credit.length) return false;
    this.debit.forEach((entry) => { if (entry.account) total += entry.amount || this.amount; });
    this.credit.forEach((entry) => { if (entry.account) total -= entry.amount || this.amount; });
    return total === 0;
  },
  calculateReconciled() {
    // If reconciled value is undefined, it means, no need to reconcile
    // Only reconciledCategories need to be reconciled, and only if they relate to bank accounts
    if (this.status === 'void') return undefined;
    const txdef = this.txdef();
    if (txdef.category === 'transfer') {
      const toAccount = Accounts.getByCode(this.toAccount, this.communityId);
      const fromAccount = Accounts.getByCode(this.fromAccount, this.communityId);
      let expectedSeIdLength = 0;
      if (toAccount.category === 'bank') expectedSeIdLength += 1;
      if (fromAccount.category === 'bank') expectedSeIdLength += 1;
      if (expectedSeIdLength) return this.seId?.length === expectedSeIdLength;
      else return undefined;
    } else if (Transactions.reconciledCategories.includes(txdef.category)) {
      const payAccount = Accounts.getByCode(this.payAccount, this.communityId);
      if (payAccount.category === 'bank') return this.seId?.length === 1;
      else return undefined;
    } else return undefined;
  },
  checkAccountsExist() {
    if (this.debit) this.debit.forEach(entry => Accounts.checkExists(this.communityId, entry.account));
    if (this.credit) this.credit.forEach(entry => Accounts.checkExists(this.communityId, entry.account));
  },
  makeEntry(side, entry) {
    let writeSide = side;
    if (entry.amount < 0) {
      // if we swap sides for negative entries
      if (this.status !== 'void' && this.category !== 'bill') {
        writeSide = Transactions.oppositeSide(writeSide);
        entry.amount *= -1;
      }
    }
    this[writeSide].push(entry);
  },
  journalEntries() {
    const entries = [];
    if (this.postedAt) {
      if (this.debit) {
        this.debit.forEach((entry, i) => {
          entries.push(_.extend({ side: 'debit', txId: this._id, _id: this._id + '#Dr' + i }, entry));
        });
      }
      if (this.credit) {
        this.credit.forEach((entry, i) => {
          entries.push(_.extend({ side: 'credit', txId: this._id, _id: this._id + '#Cr' + i }, entry));
        });
      }
    }
    return entries.map(entry => {
      Object.setPrototypeOf(entry, this);
      return JournalEntries._transform(entry);
    });
  },
  getContractAmount(contract) {
    let amount = 0;
    this.pEntries?.forEach(pe => {
      if (pe.partner === contract?.code()) {
        const sign = Transactions.signOfPartnerSide(pe.side);
        amount += sign * pe.amount;
      }
    });
    return amount;
  },
  negator() {
    const tx = Object.stringifyClone(this);
    Mongo.Collection.stripAdministrativeFields(tx);
    tx.serialId += '/STORNO';
    delete tx.note;
    tx.amount *= -1;
    if (tx.lines) {
      tx.lines.forEach(l => {
        if (l.quantity) l.quantity *= -1;
        if (l.amount) l.amount *= -1;       // payment lines dont have quantity
        if (l.metering) {
          const temp = l.metering.end; l.metering.end = l.metering.start; l.metering.start = temp;
        }
      });
    }
    if (tx.bills) tx.bills.forEach(l => l.amount *= -1);  // 'payment' have bills
    tx.debit?.forEach(l => { if (l.amount) l.amount *= -1; });
    tx.credit?.forEach(l => { if (l.amount) l.amount *= -1; });
    tx.pEntries?.forEach(l => { if (l.amount) l.amount *= -1; });
//    const temp = tx.credit; tx.credit = tx.debit; tx.debit = temp;
    return tx;
  },
  updateBalances(directionSign = 1) {
  //    if (!doc.complete) return;
    const communityId = this.communityId;
    const Balances =  Mongo.Collection.get('balances');
    const leafTag = 'T-' + moment(this.valueDate).format('YYYY-MM');
    const journalEntries = this.journalEntries();
    PeriodBreakdown.parentsOf(leafTag).forEach((tag) => {
      journalEntries?.forEach((entry) => {
        const account = entry.account;
        const localizer = entry.localizer;
        const changeAmount = entry.amount * directionSign;
        Balances.increase({ communityId, account, tag }, entry.side, changeAmount);
        if (localizer && account.startsWith(Accounts.toLocalize)) {
          Balances.increase({ communityId, account, localizer, tag }, entry.side, changeAmount);
        }
      });
    });
    // checkBalances([doc]);
  },
  updatePartnerBalances(directionSign = 1) {
    const communityId = this.communityId;
    const Balances =  Mongo.Collection.get('balances');
    const leafTag = 'T-' + moment(this.valueDate).format('YYYY-MM');
    const pEntries = this.pEntries;
    PeriodBreakdown.parentsOf(leafTag).forEach((tag) => {
      if (Period.fromTag(tag).type() !== 'month') {
        pEntries?.forEach((entry) => {
          const changeAmount = entry.amount * directionSign;
          Balances.increase({ communityId, partner: entry.partner, tag }, entry.side, changeAmount);
        });
      }
    });
  },
  makeJournalEntries() {
    // NOP -- will be overwritten in the categories
  },
  makePartnerEntries() {
    // NOP -- will be overwritten in the categories
  },
  fillFromStatementEntry() {
    // NOP -- will be overwritten in the categories
  },
  validate() {
    // NOP -- will be overwritten in the categories
  },
  displayInSelect() {
    return this.serialId;
  },
  displayInHistory() {
    const def = this.txdef();
    if (!def) return '';
    return __(def.name);
  },
  displayInStatement() {
    const partner = this.partner();
    const contract = this.contract();
    return this.displayInHistory()
      + (partner ? '<br>' + partner.toString() : '')
      + (contract ? '<br>' + contract.toString() : '');
  },
});

Transactions.attachBaseSchema(Transactions.baseSchema);
Transactions.attachBehaviour(Noted);
Transactions.attachBehaviour(Timestamped);
Transactions.attachBehaviour(SerialId(['category', 'relation', 'side']));

Transactions.attachVariantSchema(undefined, { selector: { category: 'freeTx' } });

Transactions.simpleSchema({ category: 'freeTx' }).i18n('schemaTransactions');

// --- Before/after actions ---

function checkBalances(docs) {
  const Balances = Mongo.Collection.get('balances');
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

if (Meteor.isServer) {
  Transactions.before.insert(function (userId, doc) {
    const tdoc = this.transform();
    if (tdoc.category === 'freeTx') tdoc.checkAccountsExist();
    tdoc.complete = tdoc.calculateComplete();
    tdoc.reconciled = tdoc.calculateReconciled();
    tdoc.autoFill?.();
    if (tdoc.category === 'bill' || tdoc.category === 'payment') {
      tdoc.outstanding = tdoc.calculateOutstanding();
    }
    _.extend(doc, tdoc);
  });

  Transactions.after.insert(function (userId, doc) {
    const tdoc = this.transform();
    if (tdoc.postedAt) {
      tdoc.updateBalances(+1);
      tdoc.updatePartnerBalances(+1);
    }
    if (tdoc.category === 'payment' || tdoc.category === 'allocation') tdoc.getBills().forEach(bp => tdoc.registerOnBill(bp, +1));
    const community = tdoc.community();
    if (tdoc.category === 'bill' && !_.contains(community.billsUsed, tdoc.relation)) {
      Communities.update(community._id, { $push: { billsUsed: tdoc.relation } });
    }
  });

  Transactions.before.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform();
    autoValueUpdate(Transactions, doc, modifier, 'complete', d => d.calculateComplete());
    autoValueUpdate(Transactions, doc, modifier, 'reconciled', d => d.calculateReconciled());
    if (doc.category === 'bill' || doc.category === 'receipt' || doc.category === 'payment') {
      const newDoc = Transactions._transform(_.extend({ category: doc.category }, modifier.$set));
      newDoc.autoFill?.();
      _.extend(modifier, { $set: newDoc });
      if ((doc.category === 'bill' && (newDoc.lines || newDoc.payments || newDoc.status === 'void'))
        || (doc.category === 'payment' && (newDoc.bills || newDoc.amount || newDoc.status === 'void' || modifier.$push || modifier.$pull))) {
        autoValueUpdate(Transactions, doc, modifier, 'outstanding', d => d.calculateOutstanding());
      }
    }
  });

  Transactions.after.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform();
    if (tdoc.category === 'freeTx') tdoc.checkAccountsExist();
    const oldDoc = Transactions._transform(this.previous);
    const newDoc = tdoc;
    if ((tdoc.category === 'payment' || tdoc.category === 'allocation') && modifierChangesField(modifier, ['bills'])) {
      Array.difference(oldDoc.getBills(), newDoc.getBills()).forEach(bp => oldDoc.registerOnBill(bp, -1));
      Array.difference(newDoc.getBills(), oldDoc.getBills()).forEach(bp => newDoc.registerOnBill(bp, +1));
    }
    if (modifierChangesField(modifier, ['amount'])) {
      newDoc.seId?.forEach((id) => {
        const sE = StatementEntries.findOne(id);
        const reconciled = sE.calculateReconciled();
        if (reconciled !== sE.reconciled) StatementEntries.direct.update(id, { $set: { reconciled } });
      });
    }
    if (modifierChangesField(modifier, ['debit', 'credit', 'postedAt'])) {
      if (oldDoc.postedAt) oldDoc.updateBalances(-1);
      if (newDoc.postedAt) newDoc.updateBalances(+1);
    }
    if (modifierChangesField(modifier, ['pEntries', 'postedAt'])) {
      if (oldDoc.postedAt) oldDoc.updatePartnerBalances(-1);
      if (newDoc.postedAt) newDoc.updatePartnerBalances(+1);
    }
  });

  Transactions.after.remove(function (userId, doc) {
    const tdoc = this.transform();
    if (tdoc.postedAt) {
      tdoc.updateBalances(-1);
      tdoc.updatePartnerBalances(-1);
    }
    if (tdoc.category === 'payment' || tdoc.category === 'allocation') tdoc.getBills().forEach(bp => tdoc.registerOnBill(bp, -1));
    tdoc.seId?.forEach(seId => StatementEntries.update(seId, { $pull: { txId: tdoc._id } }));
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
  return new RegExp('^' + code);
  //code[0] === '\\' ? new RegExp(code.split('\\')[1]) : code;
}

Transactions.makeFilterSelector = function makeFilterSelector(params) {
  const selector = _.clone(params);
  selector.$and = selector.$and || [];
  if (params.begin || params.end) selector.valueDate = dateSelector(params.begin, params.end);
  delete selector.begin; delete selector.end;
  if (params.defId) {
    selector.defId = params.defId;
  } else delete selector.defId;
  if (params.account) {
    const account = withSubs(params.account);
    const $or = [{ 'credit.account': account }, { 'debit.account': account }];
    selector.$and.push({ $or });
    delete selector.account;
  } else delete selector.account;
  if (params.localizer) {
    const localizer = withSubs(params.localizer);
    const $or = [{ 'credit.localizer': localizer }, { 'debit.localizer': localizer }];
    selector.$and.push({ $or });
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
  if (params.partner) {
    const partner = withSubs(params.partner);
    selector['pEntries.partner'] = partner;
    delete selector.partner;
  } else delete selector.partner;
  if (params.partnerId) {
    const partner = Partners.code(params.partnerId, params.contractId);
    selector['pEntries.partner'] = withSubs(partner);
    delete selector.partnerId;
    delete selector.contractId;
  } else {
    delete selector.partnerId;
    delete selector.contractId;
  }

  if (selector.$and.length === 0) delete selector.$and;
  return Object.cleanUndefined(selector);
};

JournalEntries.makeFilterSelector = function makeFilterSelector(params) {
  const selector = _.clone(params);
  selector.valueDate = dateSelector(params.begin, params.end);
  delete selector.begin; delete selector.end;
  delete selector.localizer;
  if (params.account) selector.account = withSubs(params.account);
  if (params.localizer) selector.localizer = withSubs(params.localizer);
  return Object.cleanUndefined(selector);
};
