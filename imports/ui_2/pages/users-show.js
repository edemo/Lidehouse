/* global alert */

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';

import './users-show.html';
import '../../api/users/users.js';

AutoForm.hooks({
  users_show: {
    // Called when any submit operation fails
    onError: function onFormError(formType, error) {
      alert(error); // eslint-disable-line no-alert
    },
  },
});

Template.Users_show.onCreated(function usersShowPageOnCreated() {
  this.getUserId = () => FlowRouter.getParam('_id');

  this.autorun(() => {
    this.subscribe('users.byId', { userId: this.getUserId() });
  });
});

Template.Users_show.helpers({
  users() {
    return Meteor.users;
  },
  document() {
    return Meteor.users.findOne({ _id: FlowRouter.getParam('_id') });
  },
});
