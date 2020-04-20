
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { CommunityRelatedRoutes } from '/imports/startup/both/routes.js';

// Automatic redirection
// if no user is logged in, then let us not show the community related pages
// (should we do something when ... or no active community selected?)

Tracker.autorun(() => {
  if (Meteor.userId() && !Meteor.user()) return;  // Don't try to perform a forceLogin, when the user doc is not yet available on the client
  const currentRoute = FlowRouter.getRouteName();
  if (CommunityRelatedRoutes.includes(currentRoute) || currentRoute === 'User data page') {
    const loginPage = currentRoute === 'Community join' ? 'signup' : 'signin';
    AccountsTemplates.forceLogin({ loginPage });
  }
});
