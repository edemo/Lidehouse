import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { Memberships } from './memberships.js';

export const insert = new ValidatedMethod({
  name: 'memberships.insert',
  validate: Memberships.simpleSchema().pick(['userId', 'communityId']).validator({ clean: true, filter: false }),
  run(doc) {
    const existingMembership = Memberships.findOne(doc);
    if (existingMembership) {
      throw new Meteor.Error('error.alreadyExist.membership',
        'Membership already exist.');
    }

    const membershipId = Memberships.insert(doc);
    return membershipId;
  },
});
