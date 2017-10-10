import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AddressSchema } from '/imports/localization/localization.js';

export const HouseProfileSchema = new SimpleSchema(
  [
    AddressSchema,
    { tel: { type: String, max: 16 } },
    { address: { type: String } },
    { lot: { type: String, max: 100 } },
  ]
);

export const HouseFinancesSchema = new SimpleSchema({
  // common cost calculation
  ccArea: { type: Number, decimal: true },
  ccVolume: { type: Number, decimal: true },
  ccHabitants: { type: Number, decimal: true },
});
