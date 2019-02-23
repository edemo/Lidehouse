import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification, chooseLeafAccountFromGroup } from '../account-specification.js';

export const MoneyTransferTx = {
  name: 'Money trasfer tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      credit: { type: String, autoform: chooseLeafAccountFromGroup('COA', '32') },
      debit: { type: String, autoform: chooseLeafAccountFromGroup('COA', '32') },
    }, _.clone(Journals.noteSchema),
  ]),
  transformToJournal(doc) {
    doc.credit = [{
      account: doc.credit,
    }];
    doc.debit = [{
      account: doc.debit,
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  MoneyTransferTx.schema.i18n('schemaJournals');
});
