import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import { Communities } from '/imports/api/communities/communities.js';
import '/imports/api/communities/actions.js';

import './community-join.html';

//  Template exists just to have shareable link to perform this action
Template.Community_join.onCreated(function onCreated() {
  this.autorun(() => {
    const communityId = FlowRouter.getParam('_cid');
    this.subscribe('communities.byId', { _id: communityId });
  });
});

Template.Community_join.onRendered(function onRendered() {
  const loop = this.autorun(() => {
    const communityId = FlowRouter.getParam('_cid');
    const community = Communities.findOne(communityId);
    const user = Meteor.user();
    // Since this is a CommunityRelated route, user will be forced to login
    if (community && user && !user.isDemo()) { // when login is succesful, that's when join will run
      loop.stop();
      Communities.actions.join({}, community).run();
    }
  });
});
