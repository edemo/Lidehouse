import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

// Import to load these templates
import '/imports/ui/layouts/app-body.js';
import '/imports/ui/pages/root-redirector.js';
import '/imports/ui/pages/app-not-found.js';
import '/imports/ui/forms/users-show-form.js';
import '/imports/ui/forms/invite-form.js';

import '/imports/ui_2/layouts/custom-body.js';
import '/imports/ui_2/pages/users-show.js';
import '/imports/ui_2/pages/communities-show.js';
import '/imports/ui_2/pages/communities-front.js';
import '/imports/ui_2/pages/communities-create.js';
import '/imports/ui_2/pages/communities-join.js';
import '/imports/ui_2/pages/community-memberships.js';
import '/imports/ui_2/pages/community-roleships.js';
import '/imports/ui_2/pages/parcel-owners.js';
import '/imports/ui_2/pages/user-delegations.js';
import '/imports/ui_2/pages/board.js';
import '/imports/ui_2/pages/messenger.js';
import '/imports/ui_2/pages/msg_people.js';
import '/imports/ui_2/pages/forum-topics.js';
import '/imports/ui_2/pages/vote-topics.js';
import '/imports/ui_2/pages/housing.js';
import '/imports/ui_2/pages/tickets-report.js';
import '/imports/ui_2/pages/parcels-finances.js';
import '/imports/ui_2/pages/community-finances.js';
import '/imports/ui_2/pages/document-store.js';
import '/imports/ui_2/pages/feedbacks.js';
import '/imports/ui_2/pages/styleguide.js';

// Import to override accounts templates
import '/imports/ui/accounts/accounts-templates.js';

FlowRouter.route('/', {
	  name: 'App.home',
	  action() {
      BlazeLayout.render('Custom_body', { main: 'Housing_page' });
		/* if (Meteor.user()) {
			BlazeLayout.render('Custom_body', { main: 'app_rootRedirector' });
		} else {
			BlazeLayout.render('Communities_front_page');
//			BlazeLayout.render('Custom_body', { main: 'Communities_front_page' });
		} */
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

FlowRouter.route('/memberships', {
  name: 'Community.memberships',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Community_memberships_page' });
  },
});

FlowRouter.route('/roleships', {
  name: 'Community.roleships',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Community_roleships_page' });
  },
});

FlowRouter.route('/owners/:_pid', {
  name: 'Parcel.owners',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Parcel_owners_page' });
  },
});

FlowRouter.route('/invite', {
  name: 'Invite',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Invite_form' });
  },
});

FlowRouter.route('/deprecated_topic/:_tid', {
  name: 'Topics.show',
  action() {
    BlazeLayout.render('App_body', { main: 'Topics_show_page' });
  },
});

FlowRouter.route('/join-community', {
  name: 'Communities.join',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Communities_join' });
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
		if (Meteor.user()) {
		    BlazeLayout.render('Custom_body', { main: 'Users_show_form' });
		} else {
		    BlazeLayout.render('Custom_body', { main: 'Users_show' });
		}
  },
});

FlowRouter.route('/board', {
  name: 'Board',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Board' });
  },
});

FlowRouter.route('/messenger', {
  name: 'Messenger',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Messenger' });
  },
});

FlowRouter.route('/forum', {
  name: 'Topics.forum',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Forum_topics' });
  },
});

FlowRouter.route('/delegations', {
  name: 'Delegations',
  action() {
    BlazeLayout.render('Custom_body', { main: 'User_delegations' });
  },
});

FlowRouter.route('/vote', {
  name: 'Topics.vote',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Vote_topics' });
  },
});

FlowRouter.route('/housing', {
  name: 'Housing_page',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Housing_page' });
  },
});

FlowRouter.route('/report', {
  name: 'Tickets.report',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Tickets_report' });
  },
});

FlowRouter.route('/parcels-finances', {
  name: 'Parcels.finances',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Parcels_finances' });
  },
});

FlowRouter.route('/community-finances', {
  name: 'Community.finances',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Community_finances' });
  },
});

FlowRouter.route('/documents', {
  name: 'DocumentStore',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Document_store' });
  },
});

FlowRouter.route('/feedbacks', {
  name: 'Feedbacks',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Feedbacks' });
  },
});

FlowRouter.route('/styleguide', {
  name: 'Styleguide',
  action() {
    BlazeLayout.render('Custom_body', { main: 'Styleguide' });
  },
});

// the App_notFound template is used for unknown routes and missing topics
FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Custom_body', { main: 'App_notFound' });
  },
};
