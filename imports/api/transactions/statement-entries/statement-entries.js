import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Factory } from 'meteor/dburles:factory';
import faker from 'faker';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';

import { __ } from '/imports/localization/i18n.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const StatementEntries = new Mongo.Collection('statementEntries');

StatementEntries.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { type: 'hidden' } },
  account: { type: String, autoform: Accounts.chooseSubNode('`38') },
  ref: { type: String, max: 50 }, // external (uniq) ref id provided by the bank
  refType: { type: String, max: 50, optional: true }, // type info to the ref
  valueDate: { type: Date },
  amount: { type: Number },
  name: { type: String, max: 50, optional: true },
  note: { type: String, max: 200, optional: true },
  statementId: { type: String, /* regEx: SimpleSchema.RegEx.Id, */ optional: true, autoform: { omit: true } },
  original: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
//  match: { type: Object, optional: true, blackbox: true, autoform: { type: 'textarea', rows: 12 } },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
});

StatementEntries.idSet = ['communityId', 'ref', 'refType'];

Meteor.startup(function indexStatementEntries() {
  StatementEntries.ensureIndex({ ref: 1 });
  StatementEntries.ensureIndex({ txId: 1 });
//  if (Meteor.isClient && MinimongoIndexing) {
  if (Meteor.isServer) {
    StatementEntries._ensureIndex({ communityId: 1, valueDate: 1 });
  }
});

StatementEntries.helpers({
  isReconciled() {
    return !!this.txId;
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

// --- Reconciliation ---

export let chooseTransaction = {};
if (Meteor.isClient) {
  import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';

  chooseTransaction = {
    relation: 'transaction',
    value() {
      const selfId = AutoForm.getFormId();
      const category = Session.get('modalContext').txdef.category;
      return ModalStack.readResult(selfId, `af.${category}.insert`);
    },
    options() {
      const communityId = Session.get('activeCommunityId');
      const txdef = Session.get('modalContext').txdef;
      const txs = Transactions.find({ communityId, defId: txdef._id, seId: { $exists: false } });
      const options = txs.map(tx => ({ label: tx.serialId, value: tx._id }));
      return options;
    },
    firstOption: () => __('(Select one)'),
  };
}
StatementEntries.reconcileSchema = new SimpleSchema({
  _id: { type: String, regEx: SimpleSchema.RegEx.Id, autoform: { omit: true } },
  txId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: chooseTransaction },
});

Meteor.startup(function attach() {
  StatementEntries.reconcileSchema.i18n('schemaStatementEntries');
});
