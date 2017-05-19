import { Meteor } from 'meteor/meteor';
import { UI } from 'meteor/blaze';
import { Session } from 'meteor/session';

UI.registerHelper('userHasPermission', function userHasPermission(permission) {
  const user = Meteor.user();
  if (!user) return false;
  const communityId = Session.get('activeCommunityId');
  return user.hasPermission(permission, communityId);
});
