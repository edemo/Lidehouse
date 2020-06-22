import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';

import { Communities } from '/imports/api/communities/communities.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';

export const StatementEntries = new Mongo.Collection('statementEntries');

StatementEntries.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  account: { type: String, autoform: _.extend({ readonly: true }, Accounts.chooseSubNode('`38')) },
  ref: { type: String, max: 50 }, // external (uniq) ref id provided by the bank
  refType: { type: String, max: 50, optional: true }, // type info to the ref
  time: { type: Date, optional: true, autoform: { type: 'datetime-local' } }, // http://khaidoan.wikidot.com/meteor-autoform-date
  valueDate: { type: Date },
  amount: { type: Number },
  name: { type: String, max: 100, optional: true },
  contraBAN: { type: String, max: 100, optional: true },
  note: { type: String, max: 250, optional: true },
  statementId: { type: String, /* regEx: SimpleSchema.RegEx.Id, */ optional: true, autoform: { omit: true } },
  row: { type: Number, optional: true }, // Row number within the statement
  original: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  match: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

StatementEntries.idSet = ['communityId', 'valueDate', 'ref', 'refType'];

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
  isReconciled() {
    return !!this.txId;
  },
  transaction() {
    const Transactions = Mongo.Collection.get('transactions');
    return this.txId && Transactions.findOne(this.txId);
  },
  impliedRelation() {
    return (this.amount > 0) ? 'customer' : 'supplier';
  },
});

Meteor.startup(function indexStatements() {
});

StatementEntries.attachSchema(StatementEntries.schema);

Meteor.startup(function attach() {
  StatementEntries.simpleSchema().i18n('schemaStatementEntries');
});
// --- Factory ---

Factory.define('statementEntry', StatementEntries, {
  account: '31',
  valueDate: () => new Date(),
  name: () => faker.random.word(),
  ref: () => faker.random.uuid(),
  note: () => faker.random.word(),
  amount: 10000,
});
