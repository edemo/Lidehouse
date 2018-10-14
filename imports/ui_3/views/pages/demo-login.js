import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { displayError } from '/imports/ui_3/lib/errors.js';
import './demo-login.html';

Template.Demo_login.onRendered(function onRendered() {
  this.getLang = () => FlowRouter.getParam('_lang');
  const lang = this.getLang();
  Meteor.call('createDemoUserWithParcel', lang, function (error, result) {
    if (error) displayError(error);
    else {
      Meteor.loginWithPassword(result, 'password', function (error) {
        if (error) displayError(error);
        else FlowRouter.go('App.home');
      });
    }
  });
});
