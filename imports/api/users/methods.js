import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';
import { insert as insertMember } from '/imports/api/memberships/methods.js';
import { check } from 'meteor/check';

import './users.js';

export const invite = new ValidatedMethod({
  name: 'user.invite',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email },
    communityId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validator(),
  run({ email, communityId }) {
    const userId = Accounts.createUser({ email, password: 'initialPassword' });
      // userId supposed to be good at this point on the client, but it is NOT,
    // so I can only add the user to the community on the server side (not nice)
    if (Meteor.isServer) {
      Accounts.sendEnrollmentEmail(userId);
      insertMember.call({ userId, communityId });
    }
    return userId;
  },
});

/* The autoform update-method doesnt seem to work with ValidatedMethod
It is passing two method parameters not one (1st is the mongo modifier object, second is the obj id.
Documentation says it is sending one object with two properties, but debugging shows otherwise)

export const update = new ValidatedMethod({
  name: 'user.update',
  validate: new SimpleSchema({
    _id: {
      type: String,
    },
    modifier: {
      type: Object,
      blackbox: true,
    },
  }).validator({isModifier: true}),
  run({ _id, modifier }) {
    console.log(_id, modifier);
    Meteor.users.update({ _id }, modifier);
  },
});
*/

Meteor.methods({
  'user.update'(modifier, _id) {
    check(_id, String);
    check(modifier, Object);
    Meteor.users.update(_id, modifier);
  },
});
