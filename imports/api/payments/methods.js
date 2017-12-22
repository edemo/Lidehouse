import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Payments } from '/imports/api/payments/payments.js';

import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { _ } from 'meteor/underscore';

export const insert = new ValidatedMethod({
  name: 'payments.insert',
  validate: Payments.simpleSchema().validator({ clean: true }),

  run(doc) {
    return Payments.insert(doc);
  },
});

export const update = new ValidatedMethod({
  name: 'payments.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    Payments.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'payments.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    Payments.remove(_id);
  },
});
