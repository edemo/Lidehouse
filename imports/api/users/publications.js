/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// Everyone has access to all of his own stuff automatically
Meteor.publish(null, function self() {
  return Meteor.users.find({ _id: this.userId });
});

// And can subscribe to the public fields of other users
Meteor.publish('users.byId', function userById(params) {
  new SimpleSchema({
    _id: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { _id } = params;

  return Meteor.users.find({ _id }, { fields: Meteor.users.publicFields });
});
