import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { _ } from 'meteor/underscore';


export function readableId(collection, preKey, folder) {
  const schema = new SimpleSchema({
    preKey: {
      type: String,
      autoValue() {
        return preKey;
      },
      optional: false },
    number: {
      type: Number,
      autoValue() {
        let number = 1;
        const pathForYear = folder ? `${folder}.readableId.year` : 'readableId.year';
        const pathForNumber = folder ? `${folder}.readableId.number` : 'readableId.number';
        const max = collection.findOne({ [pathForYear]: new Date().getFullYear() }, { sort: { [pathForNumber]: -1 } });
        if (max && folder) number = max[folder].readableId.number + 1;
        if (max && !folder) number = max.readableId.number + 1;
        return number;
      },
      optional: false },
    year: {
      type: Number,
      autoValue() {
        return new Date().getFullYear();
      }, optional: false },
  });
  return schema;
}
