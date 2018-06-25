import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Clock } from '/imports/utils/clock.js';

// The way to add Timestamps to a Schema:
//
// Collection.schema = ... the normal schema here without timestamps
// Collection.attachSchema(Collection.schema);
// Collection.attachSchema(Timestamps);
//
// Deprecated: This way Timestamps are added in additon to the normal schema
// And when you validate the inserting ValidatedMethod parameters you can use
// Collection.schema.validator({ clean: true })
// so you validate against the timestamp-less schema.
// That is important because the timestamp autoValues will only be added
// when the insert, update database operations happen (done by aldeed:collection2)
//
// New way: createdAt is optional: true, so validation doesn't complain
//

export const Timestamps = new SimpleSchema({
  createdAt: {
    type: Date,
    optional: true,
    autoValue() {
      if (this.isInsert) {
        return Clock.currentTime();
      }
      return undefined;   // means leave it alone
    },
    denyUpdate: true,
    autoform: { omit: true },
  },
  updatedAt: {
    type: Date,
    optional: true,
    autoValue() {
      return Clock.currentTime();
    },
    autoform: { omit: true },
  },
});
