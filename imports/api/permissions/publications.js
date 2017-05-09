import { Meteor } from 'meteor/meteor';
import { Roles } from './roles.js';
import { Permissions } from './permissions.js';

// All roles and permissions are published to everyone
Meteor.publish(null, function allRoles() {
  return Roles.find({});
});

Meteor.publish(null, function allPermissions() {
  return Permissions.find({});
});
