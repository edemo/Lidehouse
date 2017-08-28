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

export const billParcels = new ValidatedMethod({
  name: 'payments.billParcels',
  validate: new SimpleSchema({
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ communityId }) {
    Parcels.find().forEach((parcel) => {
      const community = Communities.findOne(communityId);
      const commonCost = ((parcel.area || 0) * (community.finances.ccArea || 0)) +
                          ((parcel.volume || 0) * (community.finances.ccVolume || 0)) +
                          ((parcel.habitants || 0) * (community.finances.ccHabitants || 0));

      for (let i = 0; i < 12; i += 1) {
        const query = {
          communityId,
          phase: 'plan',
          date: new Date(2017, i, 10),
          accounts: {
            'Befizetés nem': 'Közös költség',
            'Fizetési hely': parcel.serial.toString(),
          },
        };
        const doc = _.extend({}, query, { amount: commonCost });
        Payments.update(query, { $set: doc }, { upsert: true });
      }
    });
  },
});
