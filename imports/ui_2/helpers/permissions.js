import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

Template.registerHelper('userHasPermission', function userHasPermission(permission) {
  const user = Meteor.user();
  if (!user) return false;
  const activeCommunityId = Session.get('activeCommunityId');
  if (!activeCommunityId) return false;
  return user.hasPermission(permission, activeCommunityId);
});
