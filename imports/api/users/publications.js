/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';

// Everyone has access to all of his own stuff automatically
Meteor.publish(null, function self() {
  return Meteor.users.find({ _id: this.userId });
});
