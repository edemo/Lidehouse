import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';

import { getActiveCommunityId } from '/imports/api/communities/communities.js';
import { Journals } from '/imports/api/journals/journals.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamps } from '/imports/api/timestamps.js';

class TxDefsCollection extends Mongo.Collection {
  define(doc) {
    return super.define({ communityId: doc.communityId, name: doc.name }, doc);
  }
}
export const TxDefs = new TxDefsCollection('txdefs');

TxDefs.schema = new SimpleSchema({
  communityId: { type: String, regEx: SimpleSchema.RegEx.Id, optional: true, autoform: { omit: true } },
  name: { type: String, max: 100 },
  credit: { type: String, max: 100, optional: true }, // account node code
  debit: { type: String, max: 100, optional: true }, // account node code
});

TxDefs.helpers({
  select() {
    const selector = {
      communityId: this.communityId,
      'credit.account': this.credit,
      'debit.account': this.debit,
    };
    const txs = Journals.find(selector);
    return txs;
  },
  subscribe() {
    //??
  },
});

TxDefs.attachSchema(TxDefs.schema);
TxDefs.attachSchema(Timestamps);

TxDefs.startup(function attach() {
  TxDefs.simpleSchema().i18n('schemaTxDefs');
});
