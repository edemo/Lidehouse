// import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import { Members } from './members.js';

export const insert = new ValidatedMethod({
  name: 'members.insert',
  validate: new SimpleSchema({
    userId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
  }).validator(),
  run({ userId }) {
    let existingMember = Members.findOne({ userId });
    if (!existingMember) {
      existingMember = Members.insert({ userId });
    }
    return existingMember;
  },
});
