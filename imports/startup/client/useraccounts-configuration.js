import { Meteor } from 'meteor/meteor';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { Accounts } from 'meteor/accounts-base';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { connectMe } from '/imports/api/memberships/methods.js';

import { signinRedirect } from '/imports/startup/client/routes.js';

/*
These not needed anymore, as we do a higher level configuration in the AccountTemplates package, which sets these

Accounts.config({
  sendVerificationEmail: true,
  forbidClientAccountCreation: true,
  restrictCreationByEmailDomain: 'school.edu',
  loginExpirationDays: 30,
  oauthSecretKey: 'wgporjigrpqgdfg',
});

Accounts.ui.config({
  requestPermissions: {},
  requestOfflineToken: {},
  passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL',
});
*/

/**
 * The useraccounts package must be configured for both client and server to work properly.
 * See the Guide for reference (https://github.com/meteor-useraccounts/core/blob/master/Guide.md)
 */

AccountsTemplates.configure({
  showForgotPasswordLink: true,
  sendVerificationEmail: true,
 // enforceEmailVerification: true, /* Warning: experimental! Use it only if you have accounts-password as the only service!!! */

  defaultTemplate: 'Auth_page',
  defaultLayout: 'Blank_layout',
  defaultContentRegion: 'content',
  defaultLayoutRegions: {},

  // https://stackoverflow.com/questions/12984637/is-there-a-post-createuser-hook-in-meteor-when-using-accounts-ui-package
  // postSignUpHook(userId, info) { set some user settings here? },
});

AccountsTemplates.configureRoute('signIn', {
  name: 'signin',
  path: '/signin',
  redirect() {
    signinRedirect();
  },
});

AccountsTemplates.configureRoute('signUp', {
  name: 'signup',
  path: '/signup',
  redirect() {
    signinRedirect();
  },
});

AccountsTemplates.configureRoute('forgotPwd');

AccountsTemplates.configureRoute('resetPwd', {
  name: 'resetPwd',
  path: '/reset-password',
});

AccountsTemplates.configureRoute('verifyEmail', {
  name: 'verifyEmail',
  path: '/verify-email',
  redirect() {
    connectMe.call();
  },
});

AccountsTemplates.configureRoute('enrollAccount', {
  name: 'enrollAccount',
  path: '/enroll-account',
  redirect() {
    connectMe.call();
    FlowRouter.go('App.home');
  },
});

