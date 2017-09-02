import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Agendas } from '/imports/api/agendas/agendas.js';

export const insert = new ValidatedMethod({
  name: 'agendas.insert',
  validate: Agendas.simpleSchema().validator({ clean: true }),

  run(doc) {
    return Agendas.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'agendas.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    Agendas.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'agendas.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    Agendas.remove(_id);
  },
});
