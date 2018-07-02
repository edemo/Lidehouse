import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification } from '../account-specification.js';

export const BackOfficeTx = {
  name: 'Back office tx',
  schema: Journals.inputSchema,
  transformToJournal(doc) {
    doc.from.forEach(leg => {
      const as = new AccountSpecification(leg.account.account, leg.account.localizer);
      leg.account = as.toSchemaDef();
    });
    doc.to.forEach(leg => {
      const as = new AccountSpecification(leg.account.account, leg.account.localizer);
      leg.account = as.toSchemaDef();
    });
    return doc;
  },
};
