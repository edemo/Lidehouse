import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { __ } from '/imports/localization/i18n.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Log } from '/imports/utils/log.js';
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
  debit: { type: [String], max: 6, autoform: { ...Accounts.chooseNode }, optional: true },
  credit: { type: [String], max: 6, autoform: { ...Accounts.chooseNode }, optional: true },
});

Meteor.startup(function indexTxdefs() {
  Txdefs.ensureIndex({ communityId: 1, category: 1 });
});

Txdefs.helpers({
  community() {
    return Communities.findOne(this.communityId);
  },
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
    return false;
  },
  isAccountantTx() {
    return !_.contains(['bill', 'payment', 'receipt'], this.category);
  },
  isReconciledTx() {
    if (this.category === 'payment') {
      return !this.data.remission; // && _.contains(this.community().billsUsed, this.data.relation);
    }
    return _.contains(['receipt', 'transfer'], this.category);
  },
  conteerSide() {
    if (this.data.side) return this.data.side;  // opening, closing txs
    const relation = this.data.relation;        // bill, payment, receipt txs
    if (relation === 'supplier') return 'debit';
    if (relation === 'customer' || relation === 'member') return 'credit';
    return undefined;
  },
  conteerCodes(sideParam) {
//    Log.debug('conteerCodes');
//    Log.debug('def:', this, 'sideParam:', sideParam);
    let def = this;
    let side = sideParam;
    if (!Transactions.isValidSide(side)) {
      side = def.conteerSide();
      if (sideParam) side = Transactions.oppositeSide(side);
    }
    if (this.category === 'payment' && !sideParam) {
      def = this.correspondingBillDef();
    }
//    Log.debug('usedDef:', def, 'side:', side);
    return def[side];
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

Txdefs.simpleSchema().i18n('schemaTxdefs');

// -------- Factory

Factory.define('txdef', Txdefs, {
});

Txdefs.codesOf = function codesOf(sideParam) {
  const defId = AutoForm.getFieldValue('defId');
  if (!defId) return [];
  const txdef = Txdefs.findOne(defId);
  return txdef.conteerCodes(sideParam);
};

export const chooseConteerAccount = function (sideParam = false) { // false -> tx conteer side, true -> relation side
  return {
    options() {
      const communityId = ModalStack.getVar('communityId');
      const codes = Txdefs.codesOf(sideParam);
      return Accounts.nodeOptionsOf(communityId, codes, /*leafsOnly*/ false, /*addRootNode*/ false);
    },
    firstOption() {
      const codes = Txdefs.codesOf(sideParam);
      return (codes.length > 1) ? __('Chart of Accounts') : false;
    },
  };
};
