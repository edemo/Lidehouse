import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.registerHelper('userHasPermission', function userHasPermission(permissionName, communityId, object) {
  const user = Meteor.userOrNull();
  const relevantCommunityId = communityId || Session.get('activeCommunityId');
  if (!relevantCommunityId) return false;
  return user.hasPermission(permissionName, relevantCommunityId, object);
});
