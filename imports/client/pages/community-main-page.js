
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';

import './community-main-page.html';

Template.Community_main_page.onCreated(function onCommunityMainPageCreated() {
  this.getCommunityId = () => FlowRouter.getParam('_cid');
  this.autorun(() => {
    this.subscribe('memberships.inCommunity', { communityId: this.getCommunityId() });
  });
});

Template.Community_main_page.helpers({
  members() {
    return Memberships.find({});
  },
  memberships() {
    return Memberships;
  },
});
