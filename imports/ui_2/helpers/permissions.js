import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.registerHelper('userHasPermission', function userHasPermission(permissionName, communityId, object) {
  const user = Meteor.user();
  if (!user) return false;
  const objectCommunityId = communityId || Session.get('activeCommunityId');
  if (!objectCommunityId) return false;
  return user.hasPermission(permissionName, objectCommunityId, object);
});

Template.registerHelper('currentUserHasPermission', function currentuUserHasPermission(permissionName) {
  const user = Meteor.user();
  if (!user) return false;
  const communityId = Session.get('activeCommunityId');
  return user.hasPermission(permissionName, communityId);
});
