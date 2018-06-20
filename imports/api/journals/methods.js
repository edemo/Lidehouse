import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Journals } from '/imports/api/journals/journals.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { _ } from 'meteor/underscore';

export const insert = new ValidatedMethod({
  name: 'journals.insert',
  validate: Journals.simpleSchema().validator({ clean: true }),

  run(doc) {
    return Journals.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'journals.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    Journals.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'journals.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    Journals.remove(_id);
  },
});
