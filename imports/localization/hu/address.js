import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const HungarianAddressSchema = new SimpleSchema({
  city: { type: String, max: 100 },
  street: { type: String, max: 100 },
  number: { type: SimpleSchema.Integer },
  zip: { type: String, regEx: /^[0-9]{4}$/ },
});
