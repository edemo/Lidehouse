import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import to load these templates
import '/imports/ui/layouts/app-body.js';
import '/imports/ui/pages/root-redirector.js';
import '/imports/ui/pages/community-main-page.js';
import '/imports/ui/pages/topics-show-page.js';
import '/imports/ui/pages/app-not-found.js';
import '/imports/ui/forms/communities-create-form.js';
import '/imports/ui/forms/communities-join-form.js';
import '/imports/ui/forms/users-show-form.js';
import '/imports/ui/forms/invite-form.js';

import '/imports/ui_2/layouts/custom-body.js';
import '/imports/ui_2/pages/board.js';
import '/imports/ui_2/pages/document-store.js';
import '/imports/ui_2/pages/communities-show.js';
import '/imports/ui_2/pages/styleguide.js';

// Import to override accounts templates
import '/imports/ui/accounts/accounts-templates.js';

FlowRouter.route('/', {
  name: 'App.home',
  action() {
    BlazeLayout.render('Custom_body', { main: 'app_rootRedirector' });
  },
});

FlowRouter.route('/deprecated_community/:_cid', {
  name: 'Community.main',
  action() {
    BlazeLayout.render('App_body', { main: 'Community_main_page' });
  },
});

FlowRouter.route('/community/:_cid', {
  name: 'Communities.show',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Communities_show_page' });
  },
});

FlowRouter.route('/invite', {
  name: 'Invite',
  action() {
    BlazeLayout.render('App_body', { main: 'Invite_form' });
  },
});

FlowRouter.route('/topic/:_tid', {
  name: 'Topics.show',
  action() {
    BlazeLayout.render('App_body', { main: 'Topics_show_page' });
  },
});

FlowRouter.route('/join-community', {
  name: 'Communities.join',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Communities_join_form' });
  },
});

FlowRouter.route('/create-community', {
  name: 'Communities.create',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Communities_create_form' });
  },
});

FlowRouter.route('/user/:_id', {
  name: 'Users.show',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Users_show_form' });
  },
});

// the App_notFound template is used for unknown routes and missing topics
FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Custom_body', { main: 'App_notFound' });
  },
};

FlowRouter.route('/board', {
  name: 'Board',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Board' });
  },
});

FlowRouter.route('/documents', {
  name: 'DocumentStore',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Document_store' });
  },
});

FlowRouter.route('/styleguide', {
  name: 'Styleguide',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Styleguide' });
  },
});
