import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AddressSchema } from '/imports/localization/localization.js';

export const CondominiumProfileSchema = new SimpleSchema(
  [
    AddressSchema, {
      lot: { type: String, max: 100 },
    },
  ]
);
