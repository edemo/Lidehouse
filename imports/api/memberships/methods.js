/* globals check */

import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { Memberships } from './memberships';

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().validator({}),
  run(doc) {
    if (doc.userId) {
      const existingMembership = Memberships.findOne(doc);
      if (existingMembership) {
        throw new Meteor.Error('error.alreadyExist.membership',
          'Membership already exist.');
      }
    }
    const membershipId = Memberships.insert(doc);
    return membershipId;
  },
});

Meteor.methods({
  'memberships.update'(modifier, _id) {
    check(_id, String);
    check(modifier, Object);
    Memberships.update(_id, modifier);
  },
});

Meteor.methods({
  'memberships.remove'(_id) {
    check(_id, String);
    Memberships.remove(_id);
  },
});
