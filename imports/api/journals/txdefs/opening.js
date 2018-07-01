import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from '/imports/api/journals/journals.js';
import { TxDef } from './txdef.js';
import { AccountSpecification, AccountInputSchema } from '../account-specification.js';

export const OpeningTx = {
  name: 'Opening balance tx',
  schema: new SimpleSchema([Journals.baseSchema, {
    to: { type: AccountInputSchema },
  },
  ]),
  transformToJournal(doc) {
    const toAccount = new AccountSpecification(doc.to.account, doc.to.localizer);
    doc.legs = [{
      move: 'from',
      account: {
        'Equity': 'Opening',
        'Localizer': doc.to['Localizer'],
      },
    }, {
      move: 'to',
      account: toAccount.toSchemaDef(),
    }];
    delete doc.to;
    return doc;
  },
};

Meteor.startup(function attach() {
  OpeningTx.schema.i18n('schemaJournals');
});
