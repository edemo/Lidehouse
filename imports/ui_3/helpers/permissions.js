import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { getVisibleCommunityId } from '/imports/ui_3/lib/active-community.js';

export function currentUserHasPermission(permissionName, object, communityId) {
  const user = Meteor.userOrNull();
  const relevantCommunityId = communityId || getVisibleCommunityId();
  if (relevantCommunityId === undefined) return false;
  return user.hasPermission(permissionName, communityId, object);
}

Template.registerHelper('userHasPermission', function userHasPermission(permissionName, object) {
  return currentUserHasPermission(permissionName, object);
});
