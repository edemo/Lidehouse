import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import { Factory } from 'meteor/dburles:factory';
import { AutoForm } from 'meteor/aldeed:autoform';
import faker from 'faker';

import { __ } from '/imports/localization/i18n.js';
import { roundCurrency } from '/imports/localization/localization';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { dateSelector } from '/imports/api/utils';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Clock } from '/imports/utils/clock.js';
import { modifierChangesField, autoValueUpdate } from '/imports/api/mongo-utils.js';
import { Noted } from '/imports/api/behaviours/noted.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { SerialId } from '/imports/api/behaviours/serial-id.js';
import { allowedOptions } from '/imports/utils/autoform.js';
import { AccountSchema, LocationTagsSchema } from '/imports/api/accounting/account-specification.js';
import { JournalEntries } from '/imports/api/accounting/journal-entries/journal-entries.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { AccountingPeriods } from '/imports/api/accounting/periods/accounting-periods.js';
import { Relations } from '/imports/api/core/relations.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Contracts, chooseContract } from '/imports/api/contracts/contracts.js';
import { Partners, choosePartner } from '/imports/api/partners/partners.js';
import { StatementEntries } from '/imports/api/accounting/statement-entries/statement-entries.js';
import { AttachmentField } from '/imports/api/behaviours/attachment-field.js';

export const Transactions = new Mongo.Collection('transactions');

Transactions.categoryValues = ['bill', 'payment', 'receipt', 'barter', 'exchange', 'transfer', 'opening', 'closing', 'freeTx'];
Transactions.reconciledCategories = ['payment', 'receipt', 'transfer'];

Transactions.statuses = {
  draft: { name: 'draft', color: 'warning' },
  posted: { name: 'posted', color: 'primary' },
  void: { name: 'void', color: 'danger' },
};
Transactions.statusValues = Object.keys(Transactions.statuses);

Transactions.entrySchema = new SimpleSchema([
  AccountSchema,
  { amount: { type: Number, decimal: true, optional: true } },
  LocationTagsSchema,
  { subTx: { type: Number, optional: true, autoform: { type: 'hidden' } } }, // used in case there are more than one subTx within the tx
  // A tx leg can be directly associated with a bill, for its full amount (if a tx is associated to multiple bills, use legs for each association, one leg can belong to one bill)
  // { billId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true } },
  // { paymentId: { type: Number, decimal: true, optional: true } }, // index in the bill payments array
]);

Transactions.coreSchema = {
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  category: { type: String, allowedValues: Transactions.categoryValues, autoform: { type: 'hidden' } },
  generated: { type: Boolean, optional: true, autoform: { omit: true } }, // Generated transactions do not trigger balance updates
  valueDate: { type: Date, autoform: { defaultValue: () => new Date() } },
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
  complete: { type: Boolean, optional: true, autoform: { omit: true } },  // calculated in hooks
};

Transactions.baseSchema = new SimpleSchema([
  Transactions.coreSchema,
  Transactions.legsSchema,
]);

Transactions.idSet = [['communityId', 'serialId']];

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
    Transactions._ensureIndex({ communityId: 1, 'debit.partner': 1, valueDate: -1 }, { sparse: true });
    Transactions._ensureIndex({ communityId: 1, 'credit.partner': 1, valueDate: -1 }, { sparse: true });
    Transactions._ensureIndex({ communityId: 1, 'debit.localizer': 1, valueDate: -1 }, { sparse: true });
    Transactions._ensureIndex({ communityId: 1, 'credit.localizer': 1, valueDate: -1 }, { sparse: true });
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
  debugAssert(false, `Unrecognized side: ${side}`);
  return undefined;
};
Transactions.signOfPartnerSide = function signOfPartnerSide(side) {
  if (side === 'debit') return +1;
  if (side === 'credit') return -1;
  debugAssert(false, `Unrecognized side: ${side}`);
  return undefined;
};

Transactions.setTxdef = function setTxdef(doc, txdef) {
  if (!doc) return;
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
  displayEntityName() {
    return this.entityName();    // Will be overridden for payment as it has different display types
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
    const periodsDoc = AccountingPeriods.get(this.communityId);
    return periodsDoc.accountingClosedAt && (this.valueDate.getTime() <= periodsDoc.accountingClosedAt.getTime());
  },
  isAutoPosting() {
    return this.status === 'void' || this.txdef().isAutoPosting();
  },
  currencyRoundingFunction() {
    const relation = this.relation;
    if (relation === 'member') { // || relation === 'customer' ? , it should be: if (we issue the bill) as opposed to if we just record a bill that was issued by someone else
      const lang = this.community().settings.language;
      return val => roundCurrency(val, lang);
    } else return val => val; // but if we did not issue this bill, don't touch the numbers
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
    if (!Transactions.reconciledCategories.includes(this.category)) return undefined;
    if (this.status === 'void') return undefined;
    let tx = this;
    if (this.status === 'draft') { tx = _.clone(this); tx.makeJournalEntries(); }
    let expectedSeIdLength = 0;
    tx.journalEntries(true).forEach(je => {
      const account = Accounts.getByCode(je.account, this.communityId);
      if (['bank', 'cash'].includes(account?.category)) expectedSeIdLength += 1;
    });
    if (expectedSeIdLength) return this.seId?.length === expectedSeIdLength;
    else return undefined;
  },
  makeEntry(side, entry) {
    if (!entry.amount || !entry.account) return;
    let writeSide = side;
    if (entry.amount < 0) {
      // if we swap sides for negative entries
      if (this.status !== 'void' && this.category !== 'bill') {
        writeSide = Transactions.oppositeSide(writeSide);
        entry.amount *= -1;
      }
    }
    if (!Accounts.needsLocalization(entry.account, this.communityId)) {
      delete entry.partner;
      delete entry.localizer;
      delete entry.parcelId;
    }
    this[writeSide].push(entry);
  },
  journalEntries(includingUnposted = false) {
    const entries = [];
    if (this.postedAt || includingUnposted === true) {
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
      const self = this;
      entry.tx = () => self;
      entry.communityId = this.communityId;
      entry.valueDate = this.valueDate;
      if (entry.amount === undefined) entry.amount = this.amount;
      if (!entry.subTx) entry.subTx = 0;
      return JournalEntries._transform(entry);
    });
  },
  moveJournalEntryAccounts(codeFrom, codeTo) {
    let result = false;
    this.debit?.forEach(je => {
      if (je.account.startsWith(codeFrom)) {
        je.account = je.account.replace(codeFrom, codeTo);
        result = true;
      }
    });
    this.credit?.forEach(je => {
      if (je.account.startsWith(codeFrom)) {
        je.account = je.account.replace(codeFrom, codeTo);
        result = true;
      }
    });
    return result;
  },
  moveTransactionAccounts(codeFrom, codeTo) {
    productionAssert(false, `Accounts move is not implemented for transaction category ${this.category}`);
  },
  getContractAmount(contract) {
    let amount = 0;
    this.journalEntries().forEach(je => {
      if (je.partner === contract?.code()) {
        const sign = Transactions.signOfPartnerSide(je.side);
        amount += sign * je.amount;
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
        if (l.lateFeeBilling) l.lateFeeBilling.value *= -1;
      });
    }
    if (tx.bills) tx.bills.forEach(l => l.amount *= -1);  // 'payment' have bills
    tx.debit?.forEach(l => { if (l.amount) l.amount *= -1; });
    tx.credit?.forEach(l => { if (l.amount) l.amount *= -1; });
//    const temp = tx.credit; tx.credit = tx.debit; tx.debit = temp;
//    console.log("Storno Tx", tx);
    return tx;
  },
  updateBalances(directionSign = 1) {
    //    if (!doc.complete) return;
    if (this.generated) return;
    const communityId = this.communityId;
    const Balances =  Mongo.Collection.get('balances');
    const leafTag = 'T-' + moment(this.valueDate).format('YYYY-MM');
    const journalEntries = this.journalEntries();
    const periodBreakdown = AccountingPeriods.get(communityId).breakdown();
//    console.log('periodBreakdown', periodBreakdown.root());
    periodBreakdown.parentsOf(leafTag).forEach((tag) => {
      journalEntries?.forEach((entry) => {
        const account = entry.account;
        const partner = entry.partner;
        const localizer = entry.localizer;
        const changeAmount = entry.amount * directionSign;
        Balances.increase({ communityId, account, tag }, entry.side, changeAmount);
        if (partner) {
          Balances.increase({ communityId, account, partner, tag }, entry.side, changeAmount);
        }
        if (localizer) {
          Balances.increase({ communityId, account, localizer, tag }, entry.side, changeAmount);
        }
      });
    });
    // checkBalances([doc]);
  },
  cleanJournalEntry(entry) {
    if (!entry.account) {
      entry.amount = 0;
      return;
    }
    if (!entry.amount) entry.amount = this.amount;
    if (!Accounts.needsLocalization(entry.account, this.communityId)) {
      delete entry.partner;
      delete entry.localizer;
      delete entry.parcelId;
    }
  },
  validateJournalEntries() {
    const creditAmount = [];
    const debitAmount = [];
    const round = this.currencyRoundingFunction();
    this.journalEntries(true).forEach(je => {
      let accountCode;
      debugAssert(je.account, `No account on je. Je: ${JSON.stringify(je)}, Tx: ${JSON.stringify(this)}`);
      if (Accounts.isTechnicalCode(je.account)) accountCode = Accounts.fromTechnicalCode(je.account);
      else accountCode = je.account;
      const account = Accounts.getByCode(accountCode, je.communityId);
      if (!account) {
        throw new Meteor.Error('err_notExists', 'No such account', { code: accountCode, tx: JSON.stringify(this) });
      }
      if (!this.community().settings.allowPostToGroupAccounts && account?.isGroup) {
        console.log('Account', account);
        console.log('Accounts', Accounts.findTfetch({ communityId: this.communityId, code: account.code }));
        throw new Meteor.Error('err_notAllowed', 'Not allowed to post to group accounts', account.displayFull());
      }
      if (je.side === 'credit') creditAmount[je.subTx] = creditAmount[je.subTx] ? (creditAmount[je.subTx] + je.amount) : je.amount;
      if (je.side === 'debit') debitAmount[je.subTx] = debitAmount[je.subTx] ? (debitAmount[je.subTx] + je.amount) : je.amount;
    });
    for (let i = 0; i < creditAmount.length; i++) {
      if (round(creditAmount[i]) !== round(debitAmount[i])) {
        throw new Meteor.Error('err_notAllowed', 'Transaction sides have to have same amount', this);
      }
    }
  },
  makeJournalEntries() {
    // NOP -- will be overwritten in the categories
  },
  fillFromStatementEntry() {
    // NOP -- will be overwritten in the categories
  },
  validate() {
    if (this.contractId) {
      if (this.partnerId != this.contract()?.partnerId) throw new Meteor.Error('err_invalidData', 'Contract and Partner does not match');
    }
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

Transactions.withJournalEntries = function(tx) {
  tx.makeJournalEntries();
  return tx;
}

Transactions.attachBaseSchema(Transactions.baseSchema);
Transactions.attachBehaviour(Noted);
Transactions.attachBehaviour(Timestamped);
Transactions.attachBehaviour(SerialId(['category', 'relation', 'side']));
Transactions.attachBehaviour(AttachmentField());

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
    if (tdoc.postedAt) tdoc.updateBalances(+1);
    if (tdoc.category === 'payment') tdoc.getBills().forEach(bp => tdoc.registerOnBill(bp, +1));
    const community = tdoc.community();
    if (tdoc.category === 'bill' && !_.contains(community.billsUsed, tdoc.relation)) {
      Communities.update(community._id, { $push: { billsUsed: tdoc.relation } });
    }
    const contract = tdoc.contract();
    if (contract && !contract.accounting && tdoc.lines?.length === 1) {
      const line =  tdoc.lines[0];
      const modifier = { $set: { 'accounting.account': line.account, 'accounting.localizer': line.localizer } };
      Contracts.update(contract._id, modifier, { selector: { relation: contract.relation } });
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
        || (doc.category === 'payment' && (newDoc.bills || newDoc.amount || newDoc.status === 'void'))) {
        autoValueUpdate(Transactions, doc, modifier, 'outstanding', d => d.calculateOutstanding());
      }
      if (doc.category === 'bill' && (newDoc.payments || newDoc.lateValueBilled || newDoc.status === 'void')) {
        autoValueUpdate(Transactions, doc, modifier, 'lateValueOutstanding', d => d.calculateLateValueOutstanding());
      }
    }
  });

  Transactions.after.update(function (userId, doc, fieldNames, modifier, options) {
    const tdoc = this.transform();
    const oldDoc = Transactions._transform(this.previous);
    const newDoc = tdoc;
    if (tdoc.category === 'payment' && modifierChangesField(oldDoc, newDoc, ['bills'])) {
      Array.difference(oldDoc.getBills(), newDoc.getBills()).forEach(bp => oldDoc.registerOnBill(bp, -1));
      Array.difference(newDoc.getBills(), oldDoc.getBills()).forEach(bp => newDoc.registerOnBill(bp, +1));
    }
    if (modifierChangesField(oldDoc, newDoc, ['amount'])) {
      newDoc.seId?.forEach((id) => {
        const sE = StatementEntries.findOne(id);
        const reconciled = sE.calculateReconciled();
        if (reconciled !== sE.reconciled) StatementEntries.direct.update(id, { $set: { reconciled } });
      });
    }
    if (modifierChangesField(oldDoc, newDoc, ['valueDate', 'debit', 'credit', 'postedAt'])) {
      if (oldDoc.postedAt) oldDoc.updateBalances(-1);
      if (newDoc.postedAt) newDoc.updateBalances(+1);
    }
});

  Transactions.after.remove(function (userId, doc) {
    const tdoc = this.transform();
    if (tdoc.postedAt) tdoc.updateBalances(-1);
    if (tdoc.category === 'payment') tdoc.getBills().forEach(bp => tdoc.registerOnBill(bp, -1));
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
    const $or = [{ 'credit.partner': partner }, { 'debit.partner': partner }];
    selector.$and.push({ $or });
    delete selector.partner;
  } else delete selector.partner;
  if (params.partnerId) {
    const partner = withSubs(Partners.code(params.partnerId, params.contractId));
    const $or = [{ 'credit.partner': partner }, { 'debit.partner': partner }];
    selector.$and.push({ $or });
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
  let selector = _.clone(params);
  selector.valueDate = dateSelector(params.begin, params.end);
  delete selector.begin; delete selector.end;
  delete selector.localizer;
  if (params.account) selector.account = withSubs(params.account);
  if (params.localizer) selector.localizer = withSubs(params.localizer);
  selector = Object.cleanEmptyStrings(selector);
  return Object.cleanUndefined(selector);
};
