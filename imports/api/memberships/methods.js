import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Memberships } from './memberships';

const SAFE_VALIDATION = {
  clean: {
    filter: false,
    autoConvert: false,
  },
};

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator(SAFE_VALIDATION), // TODO: turn off clean, filter, autoConvert

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
  }).validator(),

  run({ _id, modifier }) {
    Memberships.update({ _id }, modifier);
  },
});

export const remove = new ValidatedMethod({
  name: 'memberships.remove',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),

  run({ _id }) {
    Memberships.remove(_id);
  },
});
