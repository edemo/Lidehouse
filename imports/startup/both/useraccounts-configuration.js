import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { debugAssert } from '/imports/utils/assert.js';
import { T9n } from 'meteor/softwarerero:accounts-t9n';
import { initialUsername } from '/imports/api/users/users.js';

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
  enforceEmailVerification: !Meteor.settings.public.enableDemo, /* Warning: experimental! Use it only if you have accounts-password as the only service!!! */
  showResendVerificationEmailLink: true,
  enablePasswordChange: true,
  privacyUrl: '/privacy',
  termsUrl: '/terms',

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
    user.username = initialUsername(user);
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
let verifyRedirect = () => { debugAssert(false); };
let enrollRedirect = () => { debugAssert(false); };

if (Meteor.isClient) {
  import { FlowRouter } from 'meteor/kadira:flow-router';
  import { setCurrentUserLanguage } from '/imports/startup/client/language.js';
  import { Memberships } from '/imports/api/memberships/memberships.js';
  import { showWelcomeModal } from '/imports/ui_3/views/modals/welcome-modal.js';

  export let signinRedirectRoute;
  let signinRedirectAction;

  // Automatic redirection after sign in
  // if user is coming from a page where he would have needed to be logged in, and we sent him to sign in.
  signinRedirect = function () {
    if (signinRedirectRoute) {
      FlowRouter.go(signinRedirectRoute.path, signinRedirectRoute.params);
      Meteor.setTimeout(signinRedirectAction, 500);
      signinRedirectRoute = null;
    } else FlowRouter.go('App home');
  };

  verifyRedirect = function () {
    Memberships.methods.accept.call();
    FlowRouter.go('App home');
    showWelcomeModal();
  };

  enrollRedirect = function () {
    Memberships.methods.accept.call();
    setCurrentUserLanguage();
    FlowRouter.go('App home');
    showWelcomeModal();
  };

  // Use this function if you need to perform some action that only logged in users can
  // to enforce a signin before continuing with the callback
  AccountsTemplates.forceLogin = function forceLogin(options = { loginPage: 'signin' }, callback = () => {}) {
    if (!Meteor.userId()) {
      signinRedirectRoute = FlowRouter.current();
      signinRedirectAction = callback;
      FlowRouter.go(options.loginPage);
    } else if (FlowRouter.getQueryParam('demouser') === 'out' && Meteor.user().isDemo()) {
      signinRedirectRoute = FlowRouter.current();
      signinRedirectAction = callback;
      Meteor.logout(() => FlowRouter.go(options.loginPage));
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
  redirect: verifyRedirect,
});

AccountsTemplates.configureRoute('enrollAccount', {
  name: 'enrollAccount',
  path: '/enroll-account',
  redirect: enrollRedirect,
});

// TODO: Find a good place for the t9n transaltions, or get this issue fixed in softwarerero:meteor-accounts-t9n
// https://github.com/softwarerero/meteor-accounts-t9n/issues/105
const hu = {
  // These translations were missing 
  "Required Field" : "Mező kitöltése kötelező",
  "Invalid email": "Érvénytelen email cím",
  "Minimum required length: 6": "Legalább 6 karakter hosszúnak kell lennie",
  "Verification email lost?": "Nem érkezett meg a megerősítő link?",
  "Send again": "Újraküldés",
  "Send email again": "Újraküldés",
  "Send the verification email again": "Email megerősítő link újraküldése",
  "A new email has been sent to you. If the email doesn't show up in your inbox, be sure to check your spam folder.": "Újból elküldtük a megerősítéshez szükséges linket. Ha nem jelenik meg a levelei között, nézze meg a Spam mappában, hátha oda került.",
  "Successful Registration! Please check your email and follow the instructions.": "Sikeres regisztráció! Emailben elküldtük a belépéshez szükséges instrukciókat.",
  error: {
    accounts: {
      "Address must be a valid e-mail address": "Érvénytelen email cím",
      "Please verify your email first. Check the email and follow the link!": "Az ön email címe még nincs megerősítve. Emailben elküldtük önnek a megerősítéshez szükséges link-et.",
      "Already verified": "Az email cím már korábban meg lett erősítve",
      "Token expired": "Lejárt token",
      "Login forbidden": "Sikertelen bejelentkezés",
    },
  },
  // These transations are there, but not good enough
  // https://github.com/softwarerero/meteor-accounts-t9n/blob/43fa5f4cba08838639929fa905d56b0ab101c795/t9n/hu.coffee
  choosePassword: "Válasszon egy jelszót",
  clickAgree: "A regisztráció gombra kattintva elfogadja az",
  dontHaveAnAccount: "Még nincs felhasználói fiókja?",
  forgotPassword: "Elfelejtette a jelszavát?",
  ifYouAlreadyHaveAnAccount: "Ha már van felhasználói fiókja, ",
  privacyPolicy: "Adatvédelmi tájékoztatót",
  signin: "Bejelentkezés",
  terms: "Használati feltételeket",
};
T9n.map('hu', hu);
