import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

export const OpeningBalanceTx = {
  name: 'Opening balance tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      account: { type: String, autoform: chooseLeafAccountFromGroup() },
      localizer: { type: String, autoform: chooseLeafAccountFromGroup('Localizer') },
    },
  ]),
  transformToJournal(doc) {
    doc.from = [{
      account: {
        'Equity': 'Opening',
        'Localizer': doc.localizer.split(':').pop(),
      },
    }];
    const toAccount = AccountSpecification.fromNames(doc.account, doc.localizer);
    doc.to = [{
      account: toAccount.toTags(),
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  OpeningBalanceTx.schema.i18n('schemaJournals');
});
