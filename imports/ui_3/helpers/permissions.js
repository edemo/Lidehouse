import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

export function currentUserHasPermission(permissionName, doc) {
  const user = Meteor.userOrNull();
  if (!doc) doc = {};
  doc.communityId = doc.communityId || getActiveCommunityId();
  return user.hasPermission(permissionName, doc);
}

Template.registerHelper('currentUserHasPermission', currentUserHasPermission);
