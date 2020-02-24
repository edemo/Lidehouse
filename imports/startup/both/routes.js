import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { FlowRouterTitle } from 'meteor/ostrio:flow-router-title';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { __ } from '/imports/localization/i18n.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

// Import UI pages only on the client!
// But the route defs need to be available on the server as well, for calculating link paths in emails
if (Meteor.isClient) {
  import '/imports/ui/pages/root-redirector.js';
  import '/imports/ui/pages/app-not-found.js';

  import '/imports/ui_3/views/brand/intro-page.js';
  import '/imports/ui_3/views/brand/privacy.js';
  import '/imports/ui_3/views/brand/terms.js';
  import '/imports/ui_3/views/pages/demo-login.js';
  import '/imports/ui_3/views/pages/profile-form.js';
  import '/imports/ui_3/views/pages/user-show.js';
  import '/imports/ui_3/views/pages/communities-listing.js';
  import '/imports/ui_3/views/pages/vote-topics.js';
  import '/imports/ui_3/views/pages/agendas.js';
  import '/imports/ui_3/views/pages/delegations.js';
  import '/imports/ui_3/views/pages/board.js';
  import '/imports/ui_3/views/pages/room-show.js';
  import '/imports/ui_3/views/pages/forum-topics.js';
  import '/imports/ui_3/views/pages/community-page.js';
  import '/imports/ui_3/views/pages/tickets.js';
  import '/imports/ui_3/views/pages/worksheets.js';
  import '/imports/ui_3/views/pages/contracts.js';
  import '/imports/ui_3/views/pages/parcels-finances.js';
  import '/imports/ui_3/views/pages/community-finances.js';
  import '/imports/ui_3/views/pages/inventory-page.js';
  import '/imports/ui_3/views/pages/accounting-page.js';
  import '/imports/ui_3/views/pages/shareddoc-store.js';
  import '/imports/ui_3/views/pages/topic-show.js';
  import '/imports/ui_3/views/pages/transaction-show.js';

  import '/imports/ui_3/views/layouts/main.js';
  import '/imports/ui_3/views/layouts/blank.js';

  // Import to override accounts templates
  import '/imports/ui/accounts/accounts-templates.js';

  //
  FlowRouter.triggers.enter([() => { window.scrollTo(0, 0); }]);
  new FlowRouterTitle(FlowRouter);
}

//-------------------
// Route definitions
//-------------------

FlowRouter.route('/', {
  name: 'App home',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'app_rootRedirector' });
  },
  title() {
    return __('Board');
  },
});

// --------------------------------------------
// Business info pages

FlowRouter.route('/intro', {
  name: 'App intro',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Intro_page' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});

FlowRouter.route('/demo/:_lang', {
  name: 'Demo login',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Demo_login' });
  },
  title() {
    return __('Board');
  },
});

FlowRouter.route('/privacy', {
  name: 'Privacy',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Privacy_page' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});

FlowRouter.route('/terms', {
  name: 'Terms',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Terms_page' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});

// --------------------------------------------

FlowRouter.route('/community/:_cid', {
  name: 'Community page',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
  title(params) {
    const Community = Communities.findOne({ _id: params._cid });
    return Community && `${Community.name}`;
  },
});

FlowRouter.route('/communities', {
  name: 'Communities list',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Communities_listing' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});

FlowRouter.route('/profile', {
  name: 'User data page',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Profile_form' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
/*
FlowRouter.route('/feedbacks', {
  name: 'Feedbacks',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Feedbacks' });
  },
});
*/
// --------------------------------------------
// CommunityRelatedRoutes

export const CommunityRelatedRoutes = [];

FlowRouter.route('/board', {
  name: 'Board',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Board' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Board');

FlowRouter.route('/room/:_rid', {
  name: 'Room show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Room_show' });
  },
  title(params) {
    const Room = Topics.findOne(params._rid);
    return Room && `${Room.title}`;
  },
});
CommunityRelatedRoutes.push('Room show');

FlowRouter.route('/forum', {
  name: 'Forum',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Forum_topics' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Forum');

FlowRouter.route('/votings', {
  name: 'Votings',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Vote_topics' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Votings');

FlowRouter.route('/topic/:_tid', {
  name: 'Topic show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Topic_show' });
  },
  title(params) {
    const topic = Topics.findOne(params._tid);
    return topic && `${topic.title}`;
  },
});
CommunityRelatedRoutes.push('Topic show');

FlowRouter.route('/agendas', {
  name: 'Agendas',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Agendas' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Agendas');

FlowRouter.route('/delegations', {
  name: 'Delegations',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Delegations' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Delegations');

FlowRouter.route('/tickets', {
  name: 'Tickets',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Tickets' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Tickets');

FlowRouter.route('/worksheets', {
  name: 'Worksheets',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Worksheets' });
  },
});
CommunityRelatedRoutes.push('Worksheets');

FlowRouter.route('/contracts', {
  name: 'Contracts',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Contracts' });
  },
});
CommunityRelatedRoutes.push('Contracts');

FlowRouter.route('/parcels-finances', {
  name: 'Parcels finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Parcels_finances' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Parcels finances');

FlowRouter.route('/community-finances', {
  name: 'Community finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_finances' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Community finances');

FlowRouter.route('/inventory', {
  name: 'Inventory',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Inventory_page' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Inventory');

FlowRouter.route('/accounting', {
  name: 'Accounting',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Accounting_page' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Accounting');

FlowRouter.route('/transaction/:_txid', {
  name: 'Transaction show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Transaction_show' });
  },
  title(params) {
    const tx = Transactions.findOne(params._txid);
    return tx && `${tx.serialId}`;
  },
});
CommunityRelatedRoutes.push('Transaction show');

FlowRouter.route('/community', {
  name: 'Community page default',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Community page default');

FlowRouter.route('/documents', {
  name: 'Documentstore',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Shareddoc_store' });
  },
  title() {
    return __(FlowRouter.current().route.name);
  },
});
CommunityRelatedRoutes.push('Documentstore');

FlowRouter.route('/user/:_id', {
  name: 'User show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'User_show' });
  },
  title(params) {
    const User = Meteor.users.findOne(params._id);
    return User && `${User.displayOfficialName()}`;
  },
});
CommunityRelatedRoutes.push('User show');

// --------------------------------------------------
// the App_notFound template is used for unknown routes and missing topics

FlowRouter.notFound = {
  action() {
    BlazeLayout.render('Blank_layout', { content: 'App_notFound' });
  },
  title() {
    return __('Not found');
  },
};
