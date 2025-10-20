import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { FlowRouterTitle } from 'meteor/ostrio:flow-router-title';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { __ } from '/imports/localization/i18n.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import { Transactions } from '/imports/api/accounting/transactions.js';
import { Listings } from '/imports/api/marketplace/listings/listings.js';
import { getActiveCommunity } from '/imports/ui_3/lib/active-community';

// Import UI pages only on the client!
// But the route defs need to be available on the server as well, for calculating link paths in emails
if (Meteor.isClient) {
  import '/imports/ui/pages/root-redirector.js';
  import '/imports/ui/pages/app-not-found.js';

  import '/imports/ui_3/views/brand/intro-page.js';
  import '/imports/ui_3/views/brand/landing-page-covid.js';
  import '/imports/ui_3/views/brand/privacy.js';
  import '/imports/ui_3/views/brand/terms.js';
  import '/imports/ui_3/views/brand/manual.js';
  import '/imports/ui_3/views/pages/demo-login.js';
  import '/imports/ui_3/views/pages/profile-form.js';
  import '/imports/ui_3/views/pages/user-show.js';
  import '/imports/ui_3/views/pages/communities-listing.js';
  import '/imports/ui_3/views/pages/community-launch.js';
  import '/imports/ui_3/views/pages/community-join.js';
  import '/imports/ui_3/views/pages/community-name-redirector.js';
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
  import '/imports/ui_3/views/pages/marketplace-page.js';
  import '/imports/ui_3/views/pages/shareddoc-store.js';
  import '/imports/ui_3/views/pages/topic-show.js';
  import '/imports/ui_3/views/pages/transaction-show.js';
  import '/imports/ui_3/views/pages/listing-show.js';

  import '/imports/ui_3/views/layouts/main.js';
  import '/imports/ui_3/views/layouts/blank.js';

  // Import to override accounts templates
  import '/imports/ui/accounts/accounts-templates.js';

  //
  FlowRouter.triggers.enter([() => { window.scrollTo(0, 0); }]);
  new FlowRouterTitle(FlowRouter);
}

export const CommunityRelatedRoutes = [];

function defineRoute(url, options) {
  options.title = options.title
    || function defaultTitle() { return __(FlowRouter.current().route.name); };
  FlowRouter.route(url, options);
}

//-------------------
// Route definitions
//-------------------

defineRoute('/', {
  name: 'App home',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'app_rootRedirector' });
  },
});

// --------------------------------------------
// Business info pages

defineRoute('/atlathato-tarsashazkezeles-online', {
  name: 'App intro',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Intro_page' });
  },
  title: 'Átlátható társasházkezelés online',
});

defineRoute('/online-kozgyules', {
  name: 'Landing page covid',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Landing_page_covid' });
  },
  title: 'Online közgyűlés',
});

defineRoute('/demo', {
  name: 'Demo login',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Demo_login' });
  },
});

defineRoute('/privacy', {
  name: 'Privacy',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Privacy_page' });
  },
});

defineRoute('/terms', {
  name: 'Terms',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Terms_page' });
  },
});

defineRoute('/manual', {
  name: 'Manual',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Manual_page' });
  },
});

// --------------------------------------------

defineRoute('/community', {
  name: 'Community page',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
  title() {
    const community = getActiveCommunity();
    return community && `${community.name}`;
  },
});
CommunityRelatedRoutes.push('Community page');

defineRoute('/launch', {
  name: 'Community launch',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_launch' });
  },
});

defineRoute('/community/:_cid/join', {
  name: 'Community join',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_join' });
  },
});
CommunityRelatedRoutes.push('Community join');

defineRoute('/community/:_cid', {
  name: 'Community show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
  title(params) {
    const community = Communities.findOne({ _id: params._cid });
    return community && `${community.name}`;
  },
});

defineRoute('/c/:_cname', {
  name: 'Community name redirector',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'Community_name_redirector' });
  },
});

defineRoute('/communities', {
  name: 'Communities list',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Communities_listing' });
  },
});

defineRoute('/profile', {
  name: 'User data page',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Profile_form' });
  },
});

// --------------------------------------------
// CommunityRelatedRoutes

defineRoute('/board', {
  name: 'Board',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Board' });
  },
});
CommunityRelatedRoutes.push('Board');

defineRoute('/room/:_rid', {
  name: 'Room show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Room_show' });
  },
  title(params) {
    const room = Topics.findOne(params._rid);
    return room && `${room.title}`;
  },
});
CommunityRelatedRoutes.push('Room show');

defineRoute('/forum', {
  name: 'Forum',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Forum_topics' });
  },
});
CommunityRelatedRoutes.push('Forum');

defineRoute('/votings', {
  name: 'Votings',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Vote_topics' });
  },
});
CommunityRelatedRoutes.push('Votings');

defineRoute('/topic/:_tid', {
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

defineRoute('/agendas', {
  name: 'Agendas',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Agendas' });
  },
});
CommunityRelatedRoutes.push('Agendas');

defineRoute('/delegations', {
  name: 'Delegations',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Delegations' });
  },
});
CommunityRelatedRoutes.push('Delegations');

defineRoute('/tickets', {
  name: 'Tickets report',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Tickets' });
  },
});
CommunityRelatedRoutes.push('Tickets report');

defineRoute('/worksheets', {
  name: 'Worksheets',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Worksheets' });
  },
});
CommunityRelatedRoutes.push('Worksheets');

defineRoute('/contracts', {
  name: 'Contracts',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Contracts' });
  },
});
CommunityRelatedRoutes.push('Contracts');

defineRoute('/parcels-finances', {
  name: 'Parcels finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Parcels_finances' });
  },
});
CommunityRelatedRoutes.push('Parcels finances');

defineRoute('/community-finances', {
  name: 'Community finances',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_finances' });
  },
});
CommunityRelatedRoutes.push('Community finances');

defineRoute('/inventory', {
  name: 'Inventory',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Inventory_page' });
  },
});
CommunityRelatedRoutes.push('Inventory');

defineRoute('/accounting', {
  name: 'Accounting',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Accounting_page' });
  },
});
CommunityRelatedRoutes.push('Accounting');

defineRoute('/transaction/:_txid', {
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

defineRoute('/community', {
  name: 'Community page default',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Community_page' });
  },
});
CommunityRelatedRoutes.push('Community page default');

defineRoute('/marketplace', {
  name: 'Marketplace',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Marketplace_page' });
  },
});
CommunityRelatedRoutes.push('Marketplace');

defineRoute('/listing/:_lid', {
  name: 'Listing show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Listing_show' });
  },
  title(params) {
    const listing = Listings.findOne(params._lid);
    return listing && `${listing.title}`;
  },
});
CommunityRelatedRoutes.push('Listing show');

defineRoute('/documents', {
  name: 'Documentstore',
  action() {
    BlazeLayout.render('Main_layout', { content: 'Shareddoc_store' });
  },
});
CommunityRelatedRoutes.push('Documentstore');

defineRoute('/user/:_id', {
  name: 'User show',
  action() {
    BlazeLayout.render('Main_layout', { content: 'User_show' });
  },
  title(params) {
    const user = Meteor.users.findOne(params._id);
    return user && `${user.displayOfficialName()}`;
  },
});
CommunityRelatedRoutes.push('User show');

// --------------------------------------------------
// the App_notFound template is used for unknown routes and missing topics

FlowRouter.notFound = {
  name: 'Not found',
  action() {
    BlazeLayout.render('Blank_layout', { content: 'App_notFound' });
  },
  title() {
    return __('Not found');
  },
};
