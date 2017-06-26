import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Parcels } from './parcels.js';

export const insert = new ValidatedMethod({
  name: 'parcels.insert',
  validate: Parcels.simpleSchema().validator({ clean: true }),

  run(doc) {
    return Parcels.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'parcels.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator({ clean: true }),

  run({ _id, modifier }) {
    Parcels.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'parcels.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator({ clean: true }),

  run({ _id }) {
    Parcels.remove(_id);
  },
});
