import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from '/imports/api/journals/journals.js';
import { TxDef } from './txdef.js';
import { AccountSpecification, AccountInputSchema } from '../account-specification.js';

export const BackofficeTx = {
  name: 'Back office tx',
  schema: new SimpleSchema([Journals.baseSchema, {
    from: { type: AccountInputSchema },
    to: { type: AccountInputSchema },
  },
  ]),
  transformToJournal(doc) {
    const fromAccount = new AccountSpecification(doc.from.account, doc.from.localizer);
    const toAccount = new AccountSpecification(doc.to.account, doc.to.localizer);
    doc.legs = [{
      move: 'from',
      account: fromAccount.toSchemaDef(),
    }, {
      move: 'to',
      account: toAccount.toSchemaDef(),
    }];
    delete doc.from;
    delete doc.to;
    return doc;
  },
};

Meteor.startup(function attach() {
  BackofficeTx.schema.i18n('schemaJournals');
});
