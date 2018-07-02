import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification, AccountInputSchema } from '../account-specification.js';

export const OpeningBalanceTx = {
  name: 'Opening balance tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      to: { type: AccountInputSchema },
    },
  ]),
  transformToJournal(doc) {
    doc.from = [{
      account: {
        'Equity': 'Opening',
        'Localizer': doc.account.localizer.split(':').pop(),
      },
    }];
    const toAccount = new AccountSpecification(doc.to.account, doc.to.localizer);
    doc.to = [{
      account: toAccount.toSchemaDef(),
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  OpeningBalanceTx.schema.i18n('schemaJournals');
});
