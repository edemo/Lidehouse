import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { AccountsTemplates } from 'meteor/useraccounts:core';

// Import to load these templates
import '/imports/ui/pages/root-redirector.js';
import '/imports/ui/pages/app-not-found.js';

import '/imports/ui_3/views/pages/intro-page.js';
import '/imports/ui_3/views/pages/demo-login.js';
import '/imports/ui_3/views/pages/profile-form.js';
import '/imports/ui_3/views/pages/user-show.js';
import '/imports/ui_3/views/pages/communities-listing.js';
import '/imports/ui_3/views/pages/parcel-owners.js';
import '/imports/ui_3/views/pages/vote-topics.js';
import '/imports/ui_3/views/pages/agendas.js';
import '/imports/ui_3/views/pages/delegations.js';
import '/imports/ui_3/views/pages/board.js';
import '/imports/ui_3/views/pages/room-show.js';
import '/imports/ui_3/views/pages/forum-topics.js';
import '/imports/ui_3/views/pages/community-page.js';
import '/imports/ui_3/views/pages/tickets-report.js';
import '/imports/ui_3/views/pages/parcels-finances.js';
import '/imports/ui_3/views/pages/community-finances.js';
import '/imports/ui_3/views/pages/shareddoc-store.js';
import '/imports/ui_3/views/pages/topic-show.js';
import '/imports/ui_3/views/pages/privacy.js';

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

FlowRouter.route('/intro', {
  name: 'App.intro',
  action() {
    BlazeLayout.render('Intro_page');
  },
});

FlowRouter.route('/demo/:_lang', {
  name: 'Demo.login',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Demo_login' });
  },
});

FlowRouter.route('/privacy', {
  name: 'Privacy',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Privacy_page' });
  },
});

// --------------------------------------------

FlowRouter.route('/community/:_cid', {
  name: 'Community.page',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
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

FlowRouter.route('/room/:_rid', {
  name: 'Room.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Room_show' });
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

FlowRouter.route('/topic/:_tid', {
  name: 'Topic.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Topic_show' });
  },
});
CommunityRelatedRoutes.push('Topics.show');

FlowRouter.route('/agendas', {
  name: 'Agendas',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Agendas' });
  },
});
CommunityRelatedRoutes.push('Agendas');

FlowRouter.route('/owners/:_pid', {
  name: 'Parcel.owners',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Parcel_owners_page' });
  },
});
CommunityRelatedRoutes.push('Parcel.owners');

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

FlowRouter.route('/user/:_id', {
  name: 'User.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'User_show' });
  },
});
CommunityRelatedRoutes.push('User.show');

// --------------------------------------------------

// the App_notFound template is used for unknown routes and missing topics
FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Blank_layout', { content: 'App_notFound' });
  },
};

// Automatic redirection
// if no user is logged in, then let us not show the community related pages 
// (should we do something when ... or no active community selected?)

Meteor.autorun(() => {
  const currentRoute = FlowRouter.getRouteName();
  if (CommunityRelatedRoutes.includes(currentRoute) || currentRoute === 'Profile.show') {
    AccountsTemplates.forceLogin();
  }
});
