import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Factory } from 'meteor/dburles:factory';

import { MinimongoIndexing } from '/imports/startup/both/collection-patches.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { chooseSubAccount } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamped } from '/imports/api/behaviours/timestamped.js';
import { chooseAccountNode } from '/imports/api/transactions/breakdowns/chart-of-accounts.js';

export const TxCats = new Mongo.Collection('txCats');

TxCats.define = function define(doc) {
  TxCats.upsert({ communityId: doc.communityId, name: doc.name }, { $set: doc });
};

TxCats.clone = function clone(name, communityId) {
  const doc = TxCats.findOne({ name, communityId: null });
  if (!doc) return undefined;
  Mongo.Collection.stripAdministrativeFields(doc);
  doc.communityId = communityId;
  return TxCats.insert(doc);
};

TxCats.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  name: { type: String, max: 100 },
  category: { type: String, max: 15, optional: true, autoform: { omit: true } }, // Name of the entity
  data: { type: Object, blackbox: true, optional: true, autoform: { omit: true } }, // Default data values
  debit: { type: [String], max: 6, autoform: chooseAccountNode, optional: true },
  credit: { type: [String], max: 6, autoform: chooseAccountNode, optional: true },
});

TxCats.helpers({
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
  isSimpleTx() {  // simple tx does not need any additional data to create (apart from D/C accounts)
    const isSimple = !(this.category === 'bill' || this.category === 'payment');
    return isSimple;
  },
  conteerSide() {
    debugAssert(this.category === 'bill', 'Func only available for bills');
    const relation = this.relation;
    if (relation === 'supplier') return 'debit';
    if (relation === 'customer' || relation === 'parcel') return 'credit';
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

TxCats.attachSchema(TxCats.schema);
TxCats.attachBehaviour(Timestamped);

Meteor.startup(function attach() {
  TxCats.simpleSchema().i18n('schemaTxCats');
});

Factory.define('txCat', TxCats, {
});
