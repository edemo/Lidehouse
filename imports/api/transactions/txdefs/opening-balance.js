import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';

import { Transactions } from '/imports/api/transactions/transactions.js';
import { Breakdowns } from '/imports/api/transactions/breakdowns/breakdowns.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

export const OpeningBalanceTx = {
  name: 'Opening balance tx',
  schema: new SimpleSchema([
    _.clone(Transactions.baseSchema), {
      account: { type: String, autoform: chooseLeafAccountFromGroup() },
      localizer: { type: String, autoform: chooseLeafAccountFromGroup('Localizer') },
    },
  ]),
  transformToTransaction(doc) {
    const communityId = Session.get('activeCommunityId');
    doc.credit = [{
      account: Breakdowns.name2code('Liabilities', 'Opening', communityId),
      localizer: doc.localizer,
    }];
    doc.debit = [{
      account: doc.account,
      localizer: doc.localizer,
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  OpeningBalanceTx.schema.i18n('schemaTransactions');
});
