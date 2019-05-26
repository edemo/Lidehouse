import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Accounts } from 'meteor/accounts-base';
import { __ } from '/imports/localization/i18n.js';
import { displayError } from '/imports/ui_3/lib/errors.js';
import '/imports/fixture/demohouse.js';
import './intro-page.html';

Template.Old_intro_page.events({
  'click .demouser-autologin'() {
    Meteor.call('createDemoUserWithParcel', function (error, result) {
      if (error) displayError(error);
      else {
        Meteor.loginWithPassword(result, 'password', function (error) {
          if (error) displayError(error);
          else FlowRouter.go('App home');
        });
      }
    });
  },
});
