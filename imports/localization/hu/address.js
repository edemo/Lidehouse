import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const HungarianAddressSchema = new SimpleSchema({
  zip: { type: String, regEx: /^[0-9]{4}$/ },
  city: { type: String, max: 100 },
  street: { type: String, max: 100 },
  number: { type: String, max: 100 },
});

export function hungarianDisplayAddress(c) {
  return ` ${c.zip} ${c.city}, ${c.street} ${c.number}`;
}
