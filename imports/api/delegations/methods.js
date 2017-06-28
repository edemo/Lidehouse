import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Delegations } from './delegations.js';

export const insert = new ValidatedMethod({
  name: 'delegations.insert',
  validate: Delegations.schema.validator({ clean: true }),

  run(doc) {
    return Delegations.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'delegations.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator({ clean: true }),

  run({ _id, modifier }) {
    Delegations.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'delegations.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator({ clean: true }),

  run({ _id }) {
    Delegations.remove(_id);
  },
});
