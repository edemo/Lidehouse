import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

import { getActiveCommunityId } from '/imports/api/communities/communities.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { chooseAccountNode, chooseSubAccount } from '/imports/api/transactions/account-specification.js';

class TxDefsCollection extends Mongo.Collection {
  define(doc) {
    return super.define({ communityId: doc.communityId, name: doc.name }, doc);
  }
}
export const TxDefs = new TxDefsCollection('txdefs');

TxDefs.clone = function clone(name, communityId) {
  const doc = TxDefs.findOne({ name, communityId: null });
  if (!doc) return undefined;
  delete doc._id;
  doc.communityId = communityId;
  return TxDefs.insert(doc);
};

TxDefs.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  name: { type: String, max: 100 },
  credit: { type: String, max: 100, autoform: chooseAccountNode, optional: true },
  debit: { type: String, max: 100, autoform: chooseAccountNode, optional: true },
});

TxDefs.helpers({
  schema() {
    const schema = new SimpleSchema([
      _.clone(Transactions.baseSchema), {
        credit: { type: String, autoform: chooseSubAccount('COA', this.credit) },
        debit: { type: String, autoform: chooseSubAccount('COA', this.debit) },
      }, _.clone(Transactions.noteSchema),
    ]);
    schema.i18n('schemaTransactions');
    return schema;
  },
  transformToTransaction(doc) {
    doc.credit = [{ account: doc.credit }];
    doc.debit = [{ account: doc.debit }];
  },
  select() {
    const selector = {
      communityId: this.communityId,
      'credit.account': this.credit,
      'debit.account': this.debit,
    };
    const txs = Transactions.find(selector);
    return txs;
  },
  subscribe() {
    //??
  },
});

TxDefs.attachSchema(TxDefs.schema);
TxDefs.attachSchema(Timestamps);

Meteor.startup(function attach() {
  TxDefs.simpleSchema().i18n('schemaTxDefs');
});
