import { Meteor } from 'meteor/meteor';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { Accounts } from 'meteor/accounts-base';
import { TAPi18n } from 'meteor/tap:i18n';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Communities } from '/imports/api/communities/communities.js';
import { connectMe } from '/imports/api/memberships/methods.js';
import { moment } from 'meteor/momentjs:moment';
/*
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
  },
});


export function cleanExpiredEmails() {
  const twoWeeksAgo = moment().subtract(2, 'week').toDate();
  Meteor.users.find({ 'services.email.verificationTokens': { $exists: true } }).forEach((user) => {
    const expiredTokens = user.services.email.verificationTokens.filter(token => token.when < twoWeeksAgo);
    expiredTokens.forEach((token) => {
      const email = token.address;
      Meteor.users.update({ _id: user._id }, { $pull: { emails: { address: email } } });
    });
    expiredTokens.forEach((token) => {
      const email = token.address;
      Meteor.users.update({ _id: user._id }, { $pull: { 'services.email.verificationTokens': { address: email } } });
    });
  });
  Meteor.users.find({ 'emails.address': { $exists: false } }).forEach((user) => {
    Meteor.users.remove({ _id: user._id });
  });
}

if (Meteor.isClient) {
  // https://stackoverflow.com/questions/12984637/is-there-a-post-createuser-hook-in-meteor-when-using-accounts-ui-package
  Accounts.createUser = _.wrap(Accounts.createUser, function (createUser) {
    console.log('overriding in func');
    // Store the original arguments
    const args = _.toArray(arguments).slice(1);
    const user = args[0];
    const origCallback = args[1];

    // Create a new callback function
    // Could also be defined elsewhere outside of this wrapped function
    // This is called on the client
    const newCallback = function(err) {
      if (err) {
        console.error(err);
      } else {
        console.info('success');
      }
    };

    console.log('in createUser');
    user.settings = {};
    user.settings.language = TAPi18n.getLanguage();

    // Now call the original create user function with
    // the original user object plus the new callback
    createUser(user, newCallback);
  });
/*
  Accounts.onEmailVerificationLink(function(token, done){
    Accounts.verifyEmail(token, (err) => {
      if (err) {
        console.log(err);
      } else {
        connectMe.call();
        // done();
      }
    });
  });

  Accounts.onEnrollmentLink(function(token, done){
    console.log('onenrollment link');
    // FlowRouter.go('/enroll-account/' + token);
    Accounts.resetPassword(token, newPassword, (err) => {
      if (err) {
        console.log(err);
      } else {
        console.log('great success');
        connectMe.call();
      }
    });
  });*/
}

if (Meteor.isServer) {
  // Overriding the onCreate hook
  Accounts.onCreateUser((options, user) => {

    console.log('in onCreateUser');
    console.log(options);

    // The default hook's 'profile' behavior.
    if (options.profile) {
      user.profile = options.profile;
    }

    // And the extra stuff we are adding
    if (options.settings) {
      user.settings = options.settings;
    }

    return user;
  });

  /*Accounts.urls.enrollAccount = function (token) {
    return Meteor.absoluteUrl('/#/enroll-account/' + token);
  };*/

  Accounts.emailTemplates.siteName = 'Honline';
  Accounts.emailTemplates.from = 'Honline <noreply@honline.hu>';

  Accounts.emailTemplates.enrollAccount = {
    subject(user) { return 'Enrollment to Honline'},
    text(user, url) {
      const membership = Memberships.findOne({ userEmail: user.emails[0].address })
      const community = membership.community();
      const adminEmail = community.admin().userEmail();

      return 'Dear ' + user + ','
      + '\nYou have been added as a member of community ' + community.name + ' with role: ' + membership.role + '.'
      + '\nIf you think you have been added by accident, or in fact not want to be part of that community,'
      + 'please contact the community administrator at ' + adminEmail + ', and ask him to remove you.'

      + '\n\nYou have been also invited to join the condominium management system,'
      + 'where you can follow the community issues, discuss them and even vote on them.'
      + 'You can start enjoying all its benefits as soon as you register your account with this email address.'

      + '\n\nThe following link takes you to our simple one click registration:\n'
      + url + '\n\nThanks.';
    }
  };

  Accounts.emailTemplates.verifyEmail = {
    subject(user) { return 'Verify your email address on Honline'},
    text(user, url) {
      return 'Dear ' + user + ','
      + '\nYou have been registered as a user at honline.hu with this email address. '
      + 'To confirm your registration please verify your email address within two weeks.'
      + '\n\nTo verify your account email simply click the link below:\n'
      + url + '\n\nThanks.';
    }
  };


  Meteor.setInterval(cleanExpiredEmails, moment.duration(1, 'days').asMilliseconds());
}
