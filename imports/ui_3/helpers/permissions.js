import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

export function currentUserHasPermission(permissionName, communityId, object) {
  const user = Meteor.userOrNull();
  const relevantCommunityId = communityId || Session.get('activeCommunityId');
  if (relevantCommunityId === undefined) return false;
  return user.hasPermission(permissionName, communityId, object);
}

Template.registerHelper('userHasPermission', function userHasPermission(permissionName, communityId, object) {
  return currentUserHasPermission(permissionName, communityId, object);
});
