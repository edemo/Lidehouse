import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
//import { CollectionBehaviours } from 'meteor/sewdn:collection-behaviours';
import { _ } from 'meteor/underscore';
import { Topics } from './topics/topics';


/*export function readableId(collection, preKey, folder) {
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

CollectionBehaviours.defineBehaviour('readableId', function (getTransform, args) {
  const self = this;
  self.before.insert(function (doc) {
    const currentYear = new Date().getFullYear();
    const preKey = doc.category ? doc.category.charAt(0).toUpperCase() : 'D';
    const max = self.findOne({ 'readableId.year': currentYear }, { sort: { 'readableId.number': -1 } });
    const number = max ? max.readableId.number + 1 : 1;
    doc.readableId = { preKey, number, currentYear };
  });
});

CollectionBehaviours.extendCollectionInstance(Topics);

Topics.readableId();*/

export function readableId(collection, doc) {
  const year = new Date().getFullYear();
  const preKey = doc.category ? doc.category.charAt(0).toUpperCase() : 'D';
  const max = collection.findOne({ 'readableId.year': year, 'readableId.preKey': preKey }, { sort: { 'readableId.number': -1 } });
  const number = max ? max.readableId.number + 1 : 1;
  doc.readableId = { preKey, number, year };
}

