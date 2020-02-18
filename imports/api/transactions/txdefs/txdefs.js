import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { __ } from '/imports/localization/i18n.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Transactions, oppositeSide } from '/imports/api/transactions/transactions.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { ChartOfAccounts, chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';

const Session = (Meteor.isClient) ? require('meteor/session').Session : { get: () => undefined };

export const Txdefs = new Mongo.Collection('txdefs');

Txdefs.define = function define(doc) {
  Txdefs.upsert({ communityId: doc.communityId, name: doc.name }, { $set: doc });
};

Txdefs.clone = function clone(name, communityId) {
  const doc = Txdefs.findOne({ name, communityId: null });
  if (!doc) return undefined;
  Mongo.Collection.stripAdministrativeFields(doc);
  doc.communityId = communityId;
  return Txdefs.insert(doc);
};

Txdefs.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  name: { type: String, max: 100 },
  category: { type: String, max: 15, optional: true, autoform: { omit: true } }, // Name of the entity
  data: { type: Object, blackbox: true, optional: true, autoform: { omit: true } }, // Default data values
  debit: { type: [String], max: 6, autoform: chooseAccountNode, optional: true },
  credit: { type: [String], max: 6, autoform: chooseAccountNode, optional: true },
});

Meteor.startup(function indexTxdefs() {
  Txdefs.ensureIndex({ communityId: 1, category: 1 });
});

Txdefs.helpers({
  schema() {
    const schema = new SimpleSchema([
      _.clone(Transactions.baseSchema), {
        debit: { type: String, autoform: chooseSubAccount('COA', this.debit) },
        credit: { type: String, autoform: chooseSubAccount('COA', this.credit) },
      }, _.clone(Transactions.noteSchema),
    ]);
    schema.i18n('schemaTransactions');
    return schema;
  },
  isAutoPosting() {
    return this.isAccountantTx();
  },
  isAccountantTx() {
    return !_.contains(['bill', 'payment', 'remission', 'receipt'], this.category);
  },
  isReconciledTx() {
    return _.contains(['payment', 'receipt', 'transfer', 'freeTx'], this.category);
  },
  conteerSide() {
    if (this.data.side) return this.data.side;  // opening, closing txs
    const relation = this.data.relation;        // bill, payment, receipt txs
    if (relation === 'supplier') return 'debit';
    if (relation === 'customer' || relation === 'member') return 'credit';
    return undefined;
  },
  transformToTransaction(doc) {
    doc.debit = [{ account: doc.debit }];
    doc.credit = [{ account: doc.credit }];
  },
  select() {
    const selector = {
      communityId: this.communityId,
      'debit.account': this.debit,
      'credit.account': this.credit,
    };
    const txs = Transactions.find(selector);
    return txs;
  },
  subscribe() {
    //??
  },
});

Txdefs.attachSchema(Txdefs.schema);
Txdefs.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  Txdefs.simpleSchema().i18n('schemaTxdefs');
});

// -------- Factory

Factory.define('txdef', Txdefs, {
});

export const chooseConteerAccount = {
  options() {
    const txdefId = Session.get('modalContext').txdef._id;
    const txdef = Txdefs.findOne(txdefId);
    const coa = ChartOfAccounts.get();
    if (!coa || !txdef) return [];
    const nodeCodes = txdef[txdef.conteerSide()];
    return coa.nodeOptionsOf(nodeCodes, /*leafsOnly*/ false);
  },
  firstOption: () => __('Chart Of Accounts'),
};
