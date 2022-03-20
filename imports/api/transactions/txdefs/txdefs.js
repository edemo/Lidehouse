import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';
import { __ } from '/imports/localization/i18n.js';
import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Relations } from '/imports/api/core/relations.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
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

Txdefs.paymentSubtypeValues = [
  'payment',   // partner is credited
  'identification',  // no partner accounting needed, just internal accounting done
  'remission', // partner is debited
];

Txdefs.dataSchema = new SimpleSchema({
  relation: { type: String, allowedValues: Relations.values, optional: true  },  // for bill, payment
  side: { type: String, allowedValues: ['debit', 'credit'], optional: true  },   // for opening, closing
  paymentSubType: { type: String, allowedValues: Txdefs.paymentSubtypeValues, optional: true }, // for payment
  autoPosting: { type: Boolean, optional: true },
});

Txdefs.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { type: 'hidden' } },
  name: { type: String, max: 100 },
  category: { type: String, allowedValues: Transactions.categoryValues },
  data: { type: Txdefs.dataSchema, optional: true },
  debit: { type: [String], max: 6, autoform: { ...Accounts.chooseNode }, optional: true },
  credit: { type: [String], max: 6, autoform: { ...Accounts.chooseNode }, optional: true },
  debit_unidentified: { type: [String], max: 6, autoform: { ...Accounts.chooseNode }, optional: true },
  credit_unidentified: { type: [String], max: 6, autoform: { ...Accounts.chooseNode }, optional: true },
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
    return !!this.data?.autoPosting;
  },
  isAccountantTx() {
    return !_.contains(['bill', 'payment', 'receipt'], this.category);
  },
  isReconciledTx() {
    return this.touches('`38');
  },
  touches(accountCode) {
    return _.contains(this.debit, accountCode) || _.contains(this.credit, accountCode);
  },
  conteerSide() {
    if (this.data?.side) return this.data.side;  // opening, closing txs
    const relation = this.data?.relation;        // bill, payment, receipt txs
    if (relation === 'supplier') return 'debit';
    if (relation === 'customer' || relation === 'member') return 'credit';
    return undefined;
  },
  relationSide() {
    debugAssert(this.data.relation, JSON.stringify(this));
    const relation = this.data.relation;        // bill, payment, receipt txs
    if (relation === 'supplier') return 'credit';
    if (relation === 'customer' || relation === 'member') return 'debit';
    return undefined;
  },
  unidentifiedAccount() {
    debugAssert(this.category === 'payment');
    const uniKey = `${this.conteerSide()}_unidentified`;
    debugAssert(this[uniKey].length === 1);
    return _.first(this[uniKey]);
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
    if (this.category === 'payment' && !sideParam && this.community().settings.accountingMethod === 'cash') {
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
    return Txdefs.findOne({ communityId: this.communityId, category: 'payment', 'data.relation': this.data.relation, 'data.paymentSubType': 'payment' });
  },
});

_.extend(Txdefs, {
  getByCode(code, communityId = getActiveCommunityId()) {
    return Txdefs.find({ communityId, $or: [{ debit: code }, { credit: code }] });
  },
  getByName(name, communityId = getActiveCommunityId()) {
    const txdef = Txdefs.findOne({ communityId, name });
    productionAssert(txdef, "You've removed an essential txdef", { name });
    return txdef;
  },
  findByName(name, communityId = getActiveCommunityId()) {
    const txdef = Txdefs.findOne({ communityId, name });
    return txdef;
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

export const chooseConteerAccount = function (sideParam = false) { // false -> tx conteer side, true -> other side
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
