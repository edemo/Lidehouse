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
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Accounts } from '/imports/api/accounting/accounts/accounts.js';
import { Log } from '/imports/utils/log.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { TemplatedMongoCollection } from '/imports/api/accounting/templates/templated-collection';

export const Txdefs = new TemplatedMongoCollection('txdefs', 'name');

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
  isReconciledTo(accountCode) {
    return !_.contains(['opening', 'closing'], this.category) && this.touches(accountCode);
  },
  touches(accountCode) {
    if (this.debit.find(c => accountCode.startsWith(c))) return true;
    if (this.credit.find(c => accountCode.startsWith(c))) return true;
    return false;
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
  conteerCodes(sideParam, accountingMethod) {
//    Log.info('conteerCodes');
//    Log.info('def:', this, 'sideParam:', sideParam, 'accountingMethod', accountingMethod);
    let def = this;
    let side = sideParam;
    if (!Transactions.isValidSide(side)) {
      side = def.conteerSide();
      if (sideParam) side = Transactions.oppositeSide(side);
    }
    if (this.category === 'payment' && !sideParam && accountingMethod === 'cash') {
      def = this.correspondingBillDef();
    }
 //   Log.info('usedDef:', def, 'side:', side);
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
    return Txdefs.findOneT({ communityId: this.communityId, category: 'bill', 'data.relation': this.data.relation });
  },
  correspondingPaymentDef() {
    debugAssert(this.category === 'bill');
    return Txdefs.findOneT({ communityId: this.communityId, category: 'payment', 'data.relation': this.data.relation, 'data.paymentSubType': 'payment' });
  },
});

_.extend(Txdefs, {
  getByCode(code, communityId = getActiveCommunityId()) {
    return Txdefs.findTfetch({ communityId, $or: [{ debit: code }, { credit: code }] });
  },
  getByName(name, communityId = getActiveCommunityId()) {
    const txdef = Txdefs.findOneT({ communityId, name });
    productionAssert(txdef, "You've removed an essential txdef", { name });
    return txdef;
  },
  findByName(name, communityId = getActiveCommunityId()) {
    const txdef = Txdefs.findOneT({ communityId, name });
    return txdef;
  },
});

Txdefs.attachSchema(Txdefs.schema);
Txdefs.attachBehaviour(Timestamped);

Txdefs.simpleSchema().i18n('schemaTxdefs');

// -------- Factory

Factory.define('txdef', Txdefs, {
});

Txdefs.codesOf = function codesOf(sideParam, accountingMethod) {
  const defId = AutoForm.getFieldValue('defId');
  if (!defId) return [];
  const txdef = Txdefs.findOne(defId);
  return txdef.conteerCodes(sideParam, accountingMethod);
};

// sideParam can be 'debit', 'credit' or falsy -> tx conteer side, truthy -> other side
export const chooseConteerAccount = function (sideParam = false) {
  const resultObject = {
    options() {
      const communityId = ModalStack.getVar('communityId');
      const community = Communities.findOne(communityId);
      const codes = Txdefs.codesOf(sideParam, community.settings.accountingMethod);
      return Accounts.nodeOptionsOf(communityId, codes, /*leafsOnly*/ false, /*addRootNode*/ false);
    },
    firstOption() {
      const communityId = ModalStack.getVar('communityId');
      const community = Communities.findOne(communityId);
      const codes = Txdefs.codesOf(sideParam, community.settings.accountingMethod);
      return (codes.length > 1) ? __('Chart of Accounts') : false;
    },
  };
  if (!sideParam) {
    resultObject.value = () => {
      const selfId = AutoForm.getFormId();
      const contractId = AutoForm.getFieldValue('contractId');
      if (AutoForm.getCurrentDataForForm(selfId)?.type !== 'method') return undefined; // method === input form      
      if (contractId) {
        const Contracts = Mongo.Collection.get('contracts');
        const contract = Contracts.findOne(contractId);
        return contract.accounting?.account;
      }
    };
  }
  return resultObject;
};
