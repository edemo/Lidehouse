import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

export const MoneyTransferTx = {
  name: 'Money trasfer tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      from: { type: String, autoform: chooseLeafAccountFromGroup('Assets', 'Money accounts') },
      to: { type: String, autoform: chooseLeafAccountFromGroup('Assets', 'Money accounts') },
    }, _.clone(Journals.noteSchema),
  ]),
  transformToJournal(doc) {
    const fromAccount = new AccountSpecification(doc.from);
    doc.from = [{
      account: fromAccount.toSchemaDef(),
    }];
    const toAccount = new AccountSpecification(doc.to);
    doc.to = [{
      account: toAccount.toSchemaDef(),
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  MoneyTransferTx.schema.i18n('schemaJournals');
});
