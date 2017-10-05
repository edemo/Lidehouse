import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const FreeFields = new SimpleSchema({
  freeFields: { type: Array, optional: true },
  'freeFields.$': { type: Object },
  'freeFields.$.key': { type: String, max: 25 },
  'freeFields.$.value': { type: String, max: 25 },
});

// usage:
// Parcels.attachSchema(FreeFields);
