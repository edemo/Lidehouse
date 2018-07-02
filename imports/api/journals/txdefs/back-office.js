import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification } from '../account-specification.js';

export const BackOfficeTx = {
  name: 'Back office tx',
  schema: Journals.inputSchema,
  transformToJournal(doc) {
    doc.from.forEach(entry => {
      const as = new AccountSpecification(entry.account.account, entry.account.localizer);
      entry.account = as.toSchemaDef();
    });
    doc.to.forEach(entry => {
      const as = new AccountSpecification(entry.account.account, entry.account.localizer);
      entry.account = as.toSchemaDef();
    });
    return doc;
  },
};
