import { SimpleSchema } from 'meteor/aldeed:simple-schema';

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
