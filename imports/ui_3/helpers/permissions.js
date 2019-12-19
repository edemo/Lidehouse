import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { getActiveCommunityId } from '/imports/ui_3/lib/active-community.js';

export function currentUserHasPermission(permissionName, doc) {
//  console.log("DOC before", doc);
  const user = Meteor.userOrNull();
  doc.communityId = doc.communityId || getActiveCommunityId();
//  console.log("DOC after", doc);
  return user.hasPermission(permissionName, doc);
}

Template.registerHelper('currentUserHasPermission', currentUserHasPermission);
