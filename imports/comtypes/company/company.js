import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AddressSchema } from '/imports/localization/localization.js';

export const CompanyProfileSchema = new SimpleSchema({
  number: { type: String, max: 100 },
  address: { type: AddressSchema },
});
