import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';

export const invite = new ValidatedMethod({
  name: 'user.invite',
  validate: new SimpleSchema({
    email: { type: String },
  }).validator(),
  run({ email }) {
    const userId = Accounts.createUser({ email, password: 'initialPassword' });
    if (Meteor.isServer) {
      Accounts.sendEnrollmentEmail(userId);
    }
    return userId;
  },
});
