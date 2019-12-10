import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const schema = new SimpleSchema({
  freeFields: { type: Array, optional: true },
  'freeFields.$': { type: Object },
  'freeFields.$.key': { type: String, max: 25 },
  'freeFields.$.value': { type: String, max: 25 },
});

export const FreeFields = { name: 'FreeFields',
  schema, helpers: {}, methods: {}, hooks: {},
};
