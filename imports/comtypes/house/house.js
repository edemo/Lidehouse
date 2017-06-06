import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AddressSchema } from '/imports/localization/localization.js';

export const HouseProfileSchema = new SimpleSchema({
  lot: { type: String, max: 100 },
  address: { type: AddressSchema },
});
