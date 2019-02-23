import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';

import { Journals } from '/imports/api/journals/journals.js';
import { chooseLeafAccountFromGroup } from '../account-specification.js';

export const IncomeTx = {
  name: 'Income tx',
  schema: new SimpleSchema([
    _.clone(Journals.rawSchema), {
      incomeAccount: { type: String, autoform: chooseLeafAccountFromGroup('Incomes') },
      localizer: { type: String, autoform: chooseLeafAccountFromGroup('Localizer') },
      moneyAccount: { type: String, autoform: chooseLeafAccountFromGroup('COA', '32') },
    }, _.clone(Journals.noteSchema),
  ]),
  transformToJournal(doc) {
    doc.credit = [{
      account: doc.incomeAccount,
      localizer: doc.localizer,
    }];
    doc.debit = [{
      account: doc.moneyAccount,
    }];
    return doc;
  },
};

Meteor.startup(function attach() {
  IncomeTx.schema.i18n('schemaJournals');
});
