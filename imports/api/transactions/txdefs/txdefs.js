import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';

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
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  name: { type: String, max: 100 },
  category: { type: String, max: 15, optional: true, autoform: { omit: true } }, // Name of the entity
  data: { type: Object, blackbox: true, optional: true, autoform: { omit: true } }, // Default data values
  debit: { type: [String], max: 6, autoform: Accounts.chooseNode, optional: true },
  credit: { type: [String], max: 6, autoform: Accounts.chooseNode, optional: true },
});

Meteor.startup(function indexTxdefs() {
  Txdefs.ensureIndex({ communityId: 1, category: 1 });
});

Txdefs.helpers({
  schema() {
    const schema = new SimpleSchema([
      _.clone(Transactions.baseSchema), {
        debit: { type: String, autoform: Accounts.chooseSubNode(this.debit) },
        credit: { type: String, autoform: Accounts.chooseSubNode(this.credit) },
      }, _.clone(Transactions.noteSchema),
    ]);
    schema.i18n('schemaTransactions');
    return schema;
  },
  entityName() {
    return 'txdef';
  },
  isAutoPosting() {
    return this.isAccountantTx();
  },
  isAccountantTx() {
    if (this.category === 'payment') return this.data.remission;
    return !_.contains(['bill', 'receipt'], this.category);
  },
  isReconciledTx() {
    if (this.category === 'payment') return !this.data.remission;
    return _.contains(['receipt', 'transfer', 'freeTx'], this.category);
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
  correspondingBillDef() {
    debugAssert(this.category === 'payment');
    return Txdefs.findOne({ communityId: this.communityId, category: 'bill', 'data.relation': this.data.relation });
  },
  correspondingPaymentDef() {
    debugAssert(this.category === 'bill');
    return Txdefs.findOne({ communityId: this.communityId, category: 'payment', 'data.relation': this.data.relation });
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

export const chooseConteerAccount = function (flipSide = false) {
  return {
    options() {
      const communityId = ModalStack.getVar('communityId');
      const defId = AutoForm.getFieldValue('defId');
      if (!defId) return [];
      const txdef = Txdefs.findOne(defId);
      let side = txdef.conteerSide();
      if (flipSide) side = Transactions.oppositeSide(side);
      const codes = txdef[side];
      return Accounts.nodeOptionsOf(communityId, codes, /*leafsOnly*/ false);
    },
    firstOption: () => __('Chart of Accounts'),
  };
};
