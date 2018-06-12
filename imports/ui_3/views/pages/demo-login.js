import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { displayError } from '/imports/ui/lib/errors.js';
import './demo-login.html';

Template.Demo_login.onRendered(function onRendered() {
  Meteor.call('createDemoUserWithParcel', function (error, result) {
    if (error) displayError(error);
    else {
      Meteor.loginWithPassword(result, 'password', function (error) {
        if (error) displayError(error);
        else FlowRouter.go('App.home');
      });
    }
  });
});
