import { Meteor } from 'meteor/meteor';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { Accounts } from 'meteor/accounts-base';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { connectMe } from '/imports/api/memberships/methods.js';
import { moment } from 'meteor/momentjs:moment';
import { reCreateDemoHouse } from '/imports/api/fixtures';

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
  defaultLayout: 'Custom_body',
  defaultContentRegion: 'main',
  defaultLayoutRegions: {},

  // https://stackoverflow.com/questions/12984637/is-there-a-post-createuser-hook-in-meteor-when-using-accounts-ui-package
  // postSignUpHook(userId, info) { set some user settings here? },
});

AccountsTemplates.configureRoute('signIn', {
  name: 'signin',
  path: '/signin',
});

AccountsTemplates.configureRoute('signUp', {
  name: 'join',
  path: '/join',
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
    FlowRouter.go('/');
  },
});

function cleanExpiredEmails() {
  const twoWeeksAgo = moment().subtract(2, 'week').toDate();
  //Meteor.users.find({ 'emails.0.verified' : false })
  Meteor.users.find({ 'services.email.verificationTokens': { $exists: true } }).forEach((user) => {
    const expiredTokens = user.services.email.verificationTokens.filter(token => token.when < twoWeeksAgo);
    expiredTokens.forEach((token) => {
      const email = token.address;
      Meteor.users.update({ _id: user._id }, { $pull: { emails: { address: email } } });
      Meteor.users.update({ _id: user._id }, { $pull: { 'services.email.verificationTokens': { address: email } } });
    });
  });
  // You can overwrite password.reset.enroll with "forgot email", whoever does not click on password reset link in two weeks should be deleted?
  // Meteor.users.find({ 'services.password.reset': { $exists: true } }).forEach((user) => {
  Meteor.users.find({ 'services.password.reset.reason': 'enroll' }).forEach((user) => {
    if (user.services.password.reset.when < twoWeeksAgo) {
      const email = user.services.password.reset.email;
      Meteor.users.update({ _id: user._id }, { $pull: { emails: { address: email } } });
      Meteor.users.update({ _id: user._id }, { $unset: { 'services.password.reset': { email } } });
    }
  });
  Meteor.users.find({ 'emails.address': { $exists: false } }).forEach((user) => {
    Meteor.users.remove({ _id: user._id });
  });
};

if (Meteor.isClient) {
  // nothing to do
}

if (Meteor.isServer) {
  process.env.MAIL_URL = Meteor.settings.mailSender;

  const tillMidnight = moment().endOf('day') - moment();
  Meteor.setTimeout(function() {
    cleanExpiredEmails();
    reCreateDemoHouse();
    Meteor.setInterval(function() {
      cleanExpiredEmails();
      reCreateDemoHouse();
      },
      moment.duration(1, 'days').asMilliseconds()
    );
    },
    tillMidnight
  );

}
