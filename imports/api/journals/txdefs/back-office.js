import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from '/imports/api/journals/journals.js';
import { AccountSpecification } from '../account-specification.js';

export const BackOfficeTx = {
  name: 'Back office tx',
  schema: Journals.inputSchema,
  transformToJournal(doc) {
/*    doc.credit.forEach(entry => {
      const as = AccountSpecification.fromNames(entry.account.account, entry.account.localizer);
      entry.account = as.toTags();
    });
    doc.debit.forEach(entry => {
      const as = AccountSpecification.fromNames(entry.account.account, entry.account.localizer);
      entry.account = as.toTags();
    });
*/
    return doc;
  },
};
