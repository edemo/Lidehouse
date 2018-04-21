import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import to load these templates
import '/imports/ui/layouts/app-body.js';
import '/imports/ui/pages/root-redirector.js';
import '/imports/ui/pages/app-not-found.js';
import '/imports/ui/forms/users-show-form.js';
import '/imports/ui/forms/invite-form.js';

//import '/imports/ui_2/layouts/custom-body.js';
import '/imports/ui_2/pages/intro-page.js';
import '/imports/ui_2/pages/about.js';
import '/imports/ui_2/pages/users-show.js';
import '/imports/ui_3/views/pages/communities-join.js';
import '/imports/ui_3/views/pages/parcel-owners.js';
import '/imports/ui_3/views/pages/vote-topics.js';
import '/imports/ui_3/views/pages/agendas.js';
import '/imports/ui_3/views/pages/delegations.js';
import '/imports/ui_3/views/pages/board.js';
import '/imports/ui_2/pages/messenger.js';
import '/imports/ui_2/pages/msg_people.js';
// import '/imports/ui_2/pages/forum-topics.js';
import '/imports/ui_3/views/pages/community-page.js';
import '/imports/ui_2/pages/tickets-report.js';
import '/imports/ui_2/pages/parcels-finances.js';
import '/imports/ui_2/pages/community-finances.js';
import '/imports/ui_2/pages/shareddoc-store.js';
import '/imports/ui_2/pages/feedbacks.js';
import '/imports/ui_2/pages/styleguide.js';
import '/imports/ui_2/pages/statement.js';

import '/imports/ui_3/views/layouts/main.js';
import '/imports/ui_3/views/pages/pageOne.html';
import '/imports/ui_3/views/pages/pageTwo.html';

// Import to override accounts templates
import '/imports/ui/accounts/accounts-templates.js';

//
FlowRouter.route('/theme', {
  name: 'Theme.home',
  action() {
    BlazeLayout.render('Main_layout', { content: 'pageOne' });
  },
});
//

FlowRouter.route('/', {
  name: 'App.home',
  action() {
    BlazeLayout.render('Main_layout', { content: 'app_rootRedirector' });
  },
});

FlowRouter.route('/intro', {
  name: 'App.intro',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Intro_page' });
  },
});

FlowRouter.route('/about', {
  name: 'About.us',
  action() {
    BlazeLayout.render('Main_layout', { content: 'About_page' });
  },
});

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

FlowRouter.route('/invite', {
  name: 'Invite',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Invite_form' });
  },
});

FlowRouter.route('/deprecated_topic/:_tid', {
  name: 'Topics.show',
  action() {
    BlazeLayout.render('App_body', { content: 'Topics_show_page' });
  },
});

FlowRouter.route('/join-community', {
  name: 'Communities.join',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Communities_join' });
  },
});

FlowRouter.route('/user/:_id', {
  name: 'Users.show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Users_show_form' });
  },
});

FlowRouter.route('/board', {
  name: 'Board',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Board' });
  },
});

FlowRouter.route('/messenger', {
  name: 'Messenger',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Messenger' });
  },
});

FlowRouter.route('/forum', {
  name: 'Topics.forum',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Forum_topics' });
  },
});

FlowRouter.route('/votings', {
  name: 'Topics.vote',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Vote_topics' });
  },
});

FlowRouter.route('/agendas', {
  name: 'Agendas',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Agendas' });
  },
});

FlowRouter.route('/delegations', {
  name: 'Delegations',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Delegations' });
  },
});

FlowRouter.route('/report', {
  name: 'Tickets.report',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Tickets_report' });
  },
});

FlowRouter.route('/parcels-finances', {
  name: 'Parcels.finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Parcels_finances' });
  },
});

FlowRouter.route('/community-finances', {
  name: 'Community.finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_finances' });
  },
});

FlowRouter.route('/documents', {
  name: 'DocumentStore',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Shareddoc_store' });
  },
});

FlowRouter.route('/feedbacks', {
  name: 'Feedbacks',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Feedbacks' });
  },
});

FlowRouter.route('/styleguide', {
  name: 'Styleguide',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Styleguide' });
  },
});

FlowRouter.route('/statement', {
  name: 'Statement',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Statement_page' });
  },
});

// the App_notFound template is used for unknown routes and missing topics
FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Main_layout', { content: 'App_notFound' });
  },
};
