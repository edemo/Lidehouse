import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
// import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Members } from './members.js';

export const insert = new ValidatedMethod({
  name: 'members.insert',
  validate: Members.simpleSchema().pick(['userId', 'communityId']).validator({ clean: true, filter: false }),
  run(doc) {
    const existingMember = Members.findOne(doc);
    if (existingMember) {
      throw new Meteor.Error('error.alreadyExist.member',
        'Member already exist.');
    }

    const memberId = Members.insert(doc);
    return memberId;
  },
});
