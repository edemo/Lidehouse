/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// Everyone has access to his own profile automatically
Meteor.publish(null, function self() {
  return Meteor.users.find({ _id: this.userId });
});

Meteor.publish('users.byId', function userById(params) {
  new SimpleSchema({
    userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { userId } = params;

  return Meteor.users.find({ _id: userId }, { fields: Meteor.users.publicFields });
});
