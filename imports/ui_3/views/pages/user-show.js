/* global alert */

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/api/users/users.js';
import '../components/contact-long.js';
import './user-show.html';

Template.User_show.onCreated(function usersShowPageOnCreated() {
  this.getUserId = () => FlowRouter.getParam('_id');

  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    const userId = this.getUserId();
    this.subscribe('users.byId', { communityId, userId });
    this.subscribe('memberships.byUserId', { communityId, userId });
  });
});

Template.User_show.helpers({
  user() {
    const userId = Template.instance().getUserId();
    return Meteor.users.findOne(userId);
  },
});
