import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { TAPi18n } from 'meteor/tap:i18n';

export const CompanySchema = new SimpleSchema({
  number: { type: String, max: 100, label: () => TAPi18n.__('company.communities.number') },
});
