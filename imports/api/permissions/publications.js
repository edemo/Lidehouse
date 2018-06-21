import { Meteor } from 'meteor/meteor';
import { Roles } from './roles.js';

// All roles are published to everyone
Meteor.publish(null, function allRoles() {
  return Roles.find({});
});
