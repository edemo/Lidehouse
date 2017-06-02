import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// The way to add Timestamps to a Schema:
//
// Collection.schema = ... the normal schema here without timestamps
// Collection.attachSchema(Collection.schema);
// Collection.attachSchema(Timestamps);
//
// This way Timestamps are added in additon to the normal schema
// And when you validate the insert method on the Collection you can use
// Collection.schema.validator({ clean: true })
// so you validate against the timestamp-less schema.
// That is important because the timestamp autoValues will only be added
// when the insert, update database operations happen done by aldeed:collection2

export const Timestamps = new SimpleSchema({
  createdAt: {
    type: Date,
    denyUpdate: true,
    autoValue() {
      if (this.isInsert) {
        return new Date();
      }
      return undefined;   // so it leaves it alone
    },
  },
  updatedAt: {
    type: Date,
    autoValue() {
      return new Date();
    },
  },
});
