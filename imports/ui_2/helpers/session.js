import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { Communities } from '/imports/api/communities/communities.js';

Template.registerHelper('fromSession', function fromSession(paramName) {
  return Session.get(paramName);
});

Template.registerHelper('activeCommunityId', function activeCommunityId() {
  return Session.get('activeCommunityId');
});

Template.registerHelper('activeCommunity', function activeCommunity() {
  const id = Session.get('activeCommunityId');
  return Communities.findOne(id);
});
