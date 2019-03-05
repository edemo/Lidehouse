import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

import { getActiveCommunityId } from '/imports/api/communities/communities.js';
import { Journals } from '/imports/api/journals/journals.js';
import { Breakdowns } from '/imports/api/journals/breakdowns/breakdowns.js';
import { debugAssert } from '/imports/utils/assert.js';
import { Timestamps } from '/imports/api/timestamps.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

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
  schema() {
    return new SimpleSchema([
      _.clone(Journals.rawSchema), {
        credit: { type: String, autoform: chooseLeafAccountFromGroup('COA', this.credit) },
        debit: { type: String, autoform: chooseLeafAccountFromGroup('COA', this.debit) },
      }, _.clone(Journals.noteSchema),
    ]);
  },
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

Meteor.startup(function attach() {
  TxDefs.simpleSchema().i18n('schemaTxDefs');
});
