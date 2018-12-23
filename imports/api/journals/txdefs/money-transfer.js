import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

export const MoneyTransferTx = {
  name: 'Money trasfer tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      credit: { type: String, autoform: chooseLeafAccountFromGroup('Assets', 'Money accounts') },
      debit: { type: String, autoform: chooseLeafAccountFromGroup('Assets', 'Money accounts') },
    }, _.clone(Journals.noteSchema),
  ]),
  transformToJournal(doc) {
    const fromAccount = AccountSpecification.fromNames(doc.credit);
    doc.credit = [{
      account: fromAccount.toTags(),
    }];
    const toAccount = AccountSpecification.fromNames(doc.debit);
    doc.debit = [{
      account: toAccount.toTags(),
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  MoneyTransferTx.schema.i18n('schemaJournals');
});
