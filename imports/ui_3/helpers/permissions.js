import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

export function currentUserHasPermission(permissionName, doc) {
  const user = Meteor.userOrNull();
  return user.hasPermission(permissionName, doc);
}

Template.registerHelper('currentUserHasPermission', currentUserHasPermission);
