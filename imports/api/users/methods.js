import { Meteor } from 'meteor/meteor';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Accounts } from 'meteor/accounts-base';

import { insert as insertMember } from '/imports/api/memberships/methods.js';

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
      insertMember.call({ userId, communityId, role: 'guest' });
    }
    return userId;
  },
});

// The autoform update-method doesnt work with ValidatedMethod's single parameter
// It is passing two method parameters not one (mongo modifier object, doc id).
// Unless you set singleMethodArgument=true as a form attribute on a method-update type form

export const update = new ValidatedMethod({
  name: 'user.update',
  validate: new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
    modifier: { type: Object, blackbox: true },
  }).validator(),

  run({ _id, modifier }) {
    Meteor.users.update({ _id }, modifier);
  },
});
