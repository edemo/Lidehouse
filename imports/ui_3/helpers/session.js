import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community';
import { getActivePartnerId, getActivePartner } from '/imports/ui_3/lib/active-partner';

Template.registerHelper('fromSession', function fromSession(paramName) {
  return Session.get(paramName);
});

Template.registerHelper('fromSettings', function fromSettings(paramName) {
  return Meteor.settings.public[paramName];
});

// ---- These are not from the Session any more

Template.registerHelper('activeCommunityId', function activeCommunityId() {
  return getActiveCommunityId();
});

Template.registerHelper('activeCommunity', function activeCommunity() {
  return getActiveCommunity();
});

Template.registerHelper('activePartnerId', function activePartnerId() {
  return getActivePartnerId();
});

Template.registerHelper('activePartner', function activePartner() {
  return getActivePartner();
});
