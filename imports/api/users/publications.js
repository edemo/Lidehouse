/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Meteor.publish('user.byId', function userById(params) {
  new SimpleSchema({
    userId: { type: String, regEx: SimpleSchema.RegEx.Id },
  }).validate(params);

  const { userId } = params;

  return Meteor.users.find({ _id: userId });
});

Meteor.publish(null, function self() {
  return Meteor.users.find({ _id: this.userId });
});
