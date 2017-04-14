import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const FractionSchema = new SimpleSchema({
  units: { type: Number },
  total: { type: Number },
});

export const ShareSchema = new SimpleSchema({
  name: { type: String },
  type: { type: String,
    allowedValues: ['Apartment', 'Garage', 'Storage'],
  },
  ownership: { type: FractionSchema },
});
