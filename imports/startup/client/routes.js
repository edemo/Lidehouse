import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { connectMe } from '/imports/api/memberships/methods.js';

// Import to load these templates
import '/imports/ui/pages/root-redirector.js';
import '/imports/ui/pages/app-not-found.js';

import '/imports/ui_2/pages/intro-page.js';
import '/imports/ui_3/views/pages/intro-page.js';
import '/imports/ui_3/views/pages/profile-form.js';
import '/imports/ui_3/views/pages/user-show.js';
import '/imports/ui_3/views/pages/communities-listing.js';
import '/imports/ui_3/views/pages/parcel-owners.js';
import '/imports/ui_3/views/pages/vote-topics.js';
import '/imports/ui_3/views/pages/agendas.js';
import '/imports/ui_3/views/pages/delegations.js';
import '/imports/ui_3/views/pages/board.js';
import '/imports/ui_3/views/pages/messages.js';
import '/imports/ui_3/views/pages/forum-topics.js';
import '/imports/ui_3/views/pages/community-page.js';
import '/imports/ui_3/views/pages/tickets-report.js';
import '/imports/ui_3/views/pages/parcels-finances.js';
import '/imports/ui_3/views/pages/community-finances.js';
import '/imports/ui_3/views/pages/shareddoc-store.js';
import '/imports/ui_3/views/pages/topic-show.js';

import '/imports/ui_3/views/layouts/main.js';
import '/imports/ui_3/views/layouts/blank.js';

// Import to override accounts templates
import '/imports/ui/accounts/accounts-templates.js';

//
FlowRouter.triggers.enter([() => { window.scrollTo(0, 0); }]);

FlowRouter.route('/', {
  name: 'App.home',
  action() {
    BlazeLayout.render('Main_layout', { content: 'app_rootRedirector' });
  },
});

// Business info pages

FlowRouter.route('/oldintro', {
  name: 'Old.intro',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Old_intro_page' });
  },
});

FlowRouter.route('/intro', {
  name: 'App.intro',
  action() {
    BlazeLayout.render('Intro_page');
  },
});

// --------------------------------------------

FlowRouter.route('/community/:_cid', {
  name: 'Community.page',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
});

FlowRouter.route('/owners/:_pid', {
  name: 'Parcel.owners',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Parcel_owners_page' });
  },
});

FlowRouter.route('/topic/:_tid', {
  name: 'Topic.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Topic_show' });
  },
});

FlowRouter.route('/communities', {
  name: 'Communities.listing',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Communities_listing' });
  },
});

FlowRouter.route('/profile', {
  name: 'Profile.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Profile_form' });
  },
});

FlowRouter.route('/user/:_id', {
  name: 'User.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'User_show' });
  },
});

FlowRouter.route('/feedbacks', {
  name: 'Feedbacks',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Feedbacks' });
  },
});

// CommunityRelatedRoutes

const CommunityRelatedRoutes = [];

FlowRouter.route('/board', {
  name: 'Board',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Board' });
  },
});
CommunityRelatedRoutes.push('Board');

FlowRouter.route('/messages', {
  name: 'Messages',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Messages' });
  },
});
CommunityRelatedRoutes.push('Messages');

FlowRouter.route('/forum', {
  name: 'Topics.forum',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Forum_topics' });
  },
});
CommunityRelatedRoutes.push('Topics.forum');

FlowRouter.route('/votings', {
  name: 'Topics.vote',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Vote_topics' });
  },
});
CommunityRelatedRoutes.push('Topics.vote');

FlowRouter.route('/agendas', {
  name: 'Agendas',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Agendas' });
  },
});
CommunityRelatedRoutes.push('Agendas');

FlowRouter.route('/delegations', {
  name: 'Delegations',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Delegations' });
  },
});
CommunityRelatedRoutes.push('Delegations');

FlowRouter.route('/tickets', {
  name: 'Tickets.report',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Tickets_report' });
  },
});
CommunityRelatedRoutes.push('Tickets.report');

FlowRouter.route('/parcels-finances', {
  name: 'Parcels.finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Parcels_finances' });
  },
});
CommunityRelatedRoutes.push('Parcels.finances');

FlowRouter.route('/community-finances', {
  name: 'Community.finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_finances' });
  },
});
CommunityRelatedRoutes.push('Community.finances');

FlowRouter.route('/community', {
  name: 'Community.page.default',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
});
CommunityRelatedRoutes.push('Community.page.default');

FlowRouter.route('/documents', {
  name: 'DocumentStore',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Shareddoc_store' });
  },
});
CommunityRelatedRoutes.push('DocumentStore');

// --------------------------------------------------

// the App_notFound template is used for unknown routes and missing topics
FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Blank_layout', { content: 'App_notFound' });
  },
};

// Automatic redirection after sign in
// if user is coming from a page where he would have needed to be logged in, and we sent him to sign in.

let routeBeforeSignin;

export function signinRedirect() {
  if (routeBeforeSignin) {
    FlowRouter.go(routeBeforeSignin.path, routeBeforeSignin.params);
    routeBeforeSignin = null;
  } else FlowRouter.go('App.home');
}

export function setRouteBeforeSignin(value) {
  routeBeforeSignin = value;
}

// Automatic redirection
// if no user is logged in, then let us not show the house related pages 
// (should we do something when or no active house selected?)

Meteor.autorun(() => {
  const currentRoute = FlowRouter.getRouteName();
  if (CommunityRelatedRoutes.includes(currentRoute) || currentRoute === 'Profile.show') {
    if (!Meteor.userId()) {
      setRouteBeforeSignin(FlowRouter.current());
      FlowRouter.go('signin');
    }
  }
});

// SignIn/SignUp routes

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

