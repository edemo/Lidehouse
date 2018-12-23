import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { chooseLeafAccountFromGroup } from '../account-specification.js';

export const ExpenseTx = {
  name: 'Expense tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      expenseAccount: { type: String, autoform: chooseLeafAccountFromGroup('Expenses') },
      localizer: { type: String, autoform: chooseLeafAccountFromGroup('Localizer') },
      moneyAccount: { type: String, autoform: chooseLeafAccountFromGroup('Assets', 'Money accounts') },
    }, _.clone(Journals.noteSchema),
  ]),
  transformToJournal(doc) {
    doc.credit = [{
      account: {
        'Assets': doc.moneyAccount.split(':').pop(),
      },
    }];
    doc.debit = [{
      account: {
        'Expenses': doc.incomeAccount.split(':').pop(),
        'Localizer': doc.localizer.split(':').pop(),
      },
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  ExpenseTx.schema.i18n('schemaJournals');
});
