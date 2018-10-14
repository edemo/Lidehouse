/* global alert */

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import '/imports/api/users/users.js';
import '../components/contact-long.js';
import './user-show.html';

Template.User_show.onCreated(function usersShowPageOnCreated() {
  this.getUserId = () => FlowRouter.getParam('_id');

  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('users.inCommunitybyId', { _id: this.getUserId(), communityId });
  });
});

Template.User_show.helpers({
  user() {
    const userId = Template.instance().getUserId();
    return Meteor.users.findOne(userId);
  },
});
