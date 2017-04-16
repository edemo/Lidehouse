import { SimpleSchema } from 'meteor/aldeed:simple-schema';

export const FractionSchema = new SimpleSchema({
  units: { type: SimpleSchema.Integer },
  total: { type: SimpleSchema.Integer },
});

export const ShareSchema = new SimpleSchema({
  name: { type: String,
/*    autoValue() {
      if (this.isInsert) {
        const letter = this.field('type').value.substring(0,1);
        const floor = this.field('floor').value;
        const number = this.field('number').value;
        return letter + '-' + floor + '/' + number;
      }
      return undefined; // means leave whats there alone for Updates, Upserts
    },
*/},
  type: { type: String,
    allowedValues: [
      'Apartment',
      'Parking',
      'Storage',
    ],
  },
  floor: { type: String },
  number: { type: String },
  ownership: { type: FractionSchema },
});
