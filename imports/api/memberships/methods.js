import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { CleaningParams } from '/imports/utils/validation.js';

import { Memberships } from './memberships';

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator(CleaningParams),

  run(doc) {
/*    if (doc.userId) {
      const existingMembership = Memberships.findOne(doc);
      if (existingMembership) {
        throw new Meteor.Error('error.alreadyExist.membership',
          'Membership already exist.');
      }
    }
    */
    const membershipId = Memberships.insert(doc);
    return membershipId;
  },
});

export const update = new ValidatedMethod({
  name: 'memberships.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(CleaningParams),

  run({ _id, modifier }) {
    Memberships.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'memberships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(CleaningParams),

  run({ _id }) {
    Memberships.remove(_id);
  },
});
