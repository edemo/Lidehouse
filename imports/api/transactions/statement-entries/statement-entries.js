import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { debugAssert } from '/imports/utils/assert.js';
import { Clock } from '/imports/utils/clock.js';
import { autoValueUpdate } from '/imports/api/mongo-utils.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

export const StatementEntries = new Mongo.Collection('statementEntries');

StatementEntries.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  account: { type: String, autoform: _.extend({ readonly: true }, Accounts.chooseSubNode(['`38', '`43'])) },
  ref: { type: String, max: 50, optional: true }, // external (uniq) ref id provided by the bank
  refType: { type: String, max: 50, optional: true }, // type info to the ref
  time: { type: Date, optional: true, autoform: { type: 'datetime-local' } }, // http://khaidoan.wikidot.com/meteor-autoform-date
  valueDate: { type: Date },
  amount: { type: Number, decimal: true },
  name: { type: String, max: 100, optional: true },
  contraBAN: { type: String, max: 100, optional: true },
  note: { type: String, max: 250, optional: true },
  statementId: { type: String, /* regEx: SimpleSchema.RegEx.Id, */ optional: true, autoform: { omit: true } },
  row: { type: Number, optional: true }, // Row number within the statement
  original: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  match: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  txId: { type: [String], regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  // We should refer to a journal entry here, so we could in addition to txId, provide the index of the journal entry on that tx
  reconciled: { type: Boolean, optional: true, autoform: { omit: true } }, // calculated in hooks
});

// IFF all idSet fields are present in the doc, than that should be unique selector in the collection. And if some not present, the next set is taken.
StatementEntries.idSet = [
  ['communityId', 'account', 'valueDate', 'ref', 'refType', 'amount', 'name', 'note'],
  ['communityId', 'account', 'valueDate', 'ref', 'refType', 'amount', 'name'],
  ['communityId', 'account', 'valueDate', 'ref', 'amount', 'name'],
  ['communityId', 'account', 'valueDate', 'ref', 'refType', 'amount'],  // K&H has Csomagdíj every month with the same ref, reftype, amount, and no name, no note
  ['communityId', 'account', 'valueDate', 'refType', 'amount', 'name'], // UniCredit has no ref
];

Meteor.startup(function indexStatementEntries() {
  StatementEntries.ensureIndex({ ref: 1 });
  StatementEntries.ensureIndex({ txId: 1 });
//  if (Meteor.isClient && MinimongoIndexing) {
  if (Meteor.isServer) {
    StatementEntries._ensureIndex({ communityId: 1, valueDate: 1 });
  }
});

StatementEntries.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
  nameOrType() {
    return this.name || this.refType;
  },
  isReconciled() {
    return this.reconciled;
  },
  hasReconciledTx() {
    return !!this.txId?.length;
  },
  calculateReconciled() {
    return this.reconciledAmount() === this.amount;
  },
  reconciledTransactions() {
    const Transactions = Mongo.Collection.get('transactions');
    if (this.txId?.length) return this.txId.map(id => Transactions.findOne(id));
    return undefined;
  },
  reconciledAmount() {
    let reconciledAmount = 0;
    const Transactions = Mongo.Collection.get('transactions');
    this.reconciledTransactions()?.forEach(tx => {
      if (tx) {
        tx.makeJournalEntries();
        const correspondingJe = tx.journalEntries(true).find(j => j.account === this.account);
        debugAssert(correspondingJe, `No corresponding je found in tx. \n se: ${JSON.stringify(this)}, tx: ${JSON.stringify(tx)}, tx.journalEntries: ${JSON.stringify(tx.journalEntries())} `);
        reconciledAmount += correspondingJe.amount * Transactions.signOfPartnerSide(correspondingJe.side);
      } else Log.warning(`The statement entry is reconciled to a transaction that no longer exists. se: ${JSON.stringify(this)}`);
    });
    return reconciledAmount;
  },
  unreconciledAmount() {
    return this.amount - this.reconciledAmount();
  },
  linkedTransactions() {
    const result = {};
    const Transactions = Mongo.Collection.get('transactions');
    if (this.txId?.length) {
      result.txs = this.txId.map(id => Transactions.findOne(id));
      result.isReconciledToThisSe = true;
      result.isLive = true;
    } else if (this.match?.txId) {
      const tx = Transactions.findOne(this.match.txId);
      if (!tx) {
        StatementEntries.methods.recognize.call({ _id: this._id });
        return result;
      }
      result.txs = [tx];
      result.isReconciledToThisSe = false;
      result.isLive = true;
    } else if (this.match?.tx) {
      const tx = Transactions._transform(this.match.tx);
      result.txs = [tx];
      result.isReconciledToThisSe = false;
      result.isLive = false;
    }
    return result;
  },
  impliedRelation() {
    return (this.amount > 0) ? 'customer' : 'supplier';
  },
  display() {
    return `${this.refType || '---'}<br>${this.name}<br>${this.note || ''}`;
  },
});

StatementEntries.attachSchema(StatementEntries.schema);

StatementEntries.simpleSchema().i18n('schemaStatementEntries');

// --- Before/after actions ---

if (Meteor.isServer) {
  StatementEntries.before.insert(function (userId, doc) {
    const tdoc = this.transform();
    doc.reconciled = tdoc.calculateReconciled();
  });

  StatementEntries.before.update(function (userId, doc, fieldNames, modifier, options) {
    autoValueUpdate(StatementEntries, doc, modifier, 'reconciled', d => d.calculateReconciled());
  });
}

// --- Factory ---

Factory.define('statementEntry', StatementEntries, {
  account: '31',
  valueDate: () => Clock.currentDate(),
  name: () => faker.random.word(),
  ref: () => faker.random.uuid(),
  note: () => faker.random.word(),
  amount: 10000,
});
