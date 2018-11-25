import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { debugAssert } from '/imports/utils/assert.js';

/**
 * The useraccounts package must be configured for both client and server to work properly.
 * See the Guide for reference (https://github.com/meteor-useraccounts/core/blob/master/Guide.md)
 */

/*
Accounts.config not needed anymore,
we do a higher level configuration in the AccountTemplates package, which sets these

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

AccountsTemplates.configure({
  showForgotPasswordLink: true,
  sendVerificationEmail: true,
  // enforceEmailVerification: true, /* Warning: experimental! Use it only if you have accounts-password as the only service!!! */
  enablePasswordChange: true,

  defaultTemplate: 'Auth_page',
  defaultLayout: 'Blank_layout',
  defaultContentRegion: 'content',
  defaultLayoutRegions: {},

  // We need to set the language on SignUp, so we put it into the options on the Client to send it to the Server
  preSignUpHook(password, options) {
    if (Meteor.isClient) {
      import { getBrowserLanguage } from '/imports/startup/client/language.js';

      options.language = getBrowserLanguage();
    }
  },
  // https://stackoverflow.com/questions/12984637/is-there-a-post-createuser-hook-in-meteor-when-using-accounts-ui-package
});

// We retrieve the language from the options on the server, and use it to set the language of the new user object
if (Meteor.isServer) {
  Accounts.onCreateUser((options, user) => {
    user.settings = user.settings || {};
    user.settings.language = options.language;
//    user.profile = options.profile;
    return user;
  });
}

// --- SERVICES ---
// Signin services can be configured in the Settings file
if (Meteor.settings.facebook) {
  ServiceConfiguration.configurations.upsert({
    service: 'facebook',
  }, {
    $set: {
      appId: Meteor.settings.facebook.appId,
      loginStyle: 'popup',
      secret: Meteor.settings.facebook.secret,
    },
  });
}

if (Meteor.settings.google) {
  ServiceConfiguration.configurations.upsert({
    service: 'google',
  }, {
    $set: {
      clientId: Meteor.settings.google.clientId,
      loginStyle: 'popup',
      secret: Meteor.settings.google.client_secret,
    },
  });
}

// --- ROUTING ---
// Here are some blank functions, so we can configure AccountsTemplates on server side without pulling in UI libraries
let signinRedirect = () => { debugAssert(false); };
let enrollRedirect = () => { debugAssert(false); };

if (Meteor.isClient) {
  import { FlowRouter } from 'meteor/kadira:flow-router';
  import { connectMe } from '/imports/api/memberships/methods.js';
  import { showWelcomeModal } from '/imports/ui_3/views/modals/welcome-modal.js';

  let signinRedirectRoute;
  let signinRedirectAction;

  // Automatic redirection after sign in
  // if user is coming from a page where he would have needed to be logged in, and we sent him to sign in.
  signinRedirect = function () {
    if (signinRedirectRoute) {
      FlowRouter.go(signinRedirectRoute.path, signinRedirectRoute.params);
      Meteor.setTimeout(signinRedirectAction, 500);
      signinRedirectRoute = null;
    } else FlowRouter.go('App.home');
  };

  enrollRedirect = function () {
    connectMe.call();
    FlowRouter.go('App.home');
    showWelcomeModal();
  };

  // Use this function if you need to perform some action that only logged in users can
  // to enforce a signin before continuing with the callback
  AccountsTemplates.forceLogin = function forceLogin(callback = () => {}) {
    if (!Meteor.userId()) {
      signinRedirectRoute = FlowRouter.current();
      signinRedirectAction = callback;
      FlowRouter.go('signin');
    } else callback();
  };
}

// AccountsTemplates routes that need url generation from token are here in startup/both
// because they need both server and client side for proper url generation

AccountsTemplates.configureRoute('signIn', {
  name: 'signin',
  path: '/signin',
  redirect: signinRedirect,
});

AccountsTemplates.configureRoute('signUp', {
  name: 'signup',
  path: '/signup',
  redirect: signinRedirect,
});

AccountsTemplates.configureRoute('forgotPwd');

AccountsTemplates.configureRoute('changePwd', {
  name: 'changePwd',
  path: '/change-password',
});

AccountsTemplates.configureRoute('resetPwd', {
  name: 'resetPwd',
  path: '/reset-password',
});

AccountsTemplates.configureRoute('verifyEmail', {
  name: 'verifyEmail',
  path: '/verify-email',
  redirect: enrollRedirect,
});

AccountsTemplates.configureRoute('enrollAccount', {
  name: 'enrollAccount',
  path: '/enroll-account',
  redirect: enrollRedirect,
});
