import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import '../common/ibox-tools.js';
import '../common/navigation.js';
import '../common/top-navbar.js';
import '../common/page-heading.js';
import '../common/footer.js';
import '../common/right-sidebar.js';
import './main.html';

Template.Main_layout.onCreated(function() {
  // Subscriptions
  // We run this in autorun, so when a new User logs in, the subscription changes
  this.autorun(() => {
    this.subscribe('memberships.ofUser', { userId: Meteor.userId() });
    this.subscribe('delegations.toUser', { userId: Meteor.userId() });
    this.subscribe('delegations.fromUser', { userId: Meteor.userId() });
  });
  // This autorun sets the active community automatically to the first community of the user
  // TODO: active community could be saved somewhere so he gets back where he left off last time
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    const user = Meteor.user();
    if (user && (!activeCommunityId || !user.isInCommunity(activeCommunityId))) {
      const communities = user.communities();
      if (communities.count() > 0) {
        const activeCommunity = communities.fetch()[0];
        Session.set('activeCommunityId', activeCommunity._id);
      }
    }
    // although this is too early, but if we sub it in Finances page, the datatables has no way to refresh
    this.subscribe('payaccounts.inCommunity', { communityId: activeCommunityId });
  });
  // We run this in autorun, so when User switches his community, the subscription changes
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    if (activeCommunityId) {
      this.subscribe('parcels.inCommunity', { communityId: activeCommunityId });
      this.subscribe('memberships.inCommunity', { communityId: activeCommunityId });
    }
  });
  // We subscribe to all topics in the community, so that we have access to the commentCounters
  this.autorun(() => {
    const communityId = Session.get('activeCommunityId');
    this.subscribe('topics.inCommunity', { communityId });
    this.subscribe('agendas.inCommunity', { communityId });
  });
  this.autorun(() => {
    const user = Meteor.userOrNull();
    const communityId = Session.get('activeCommunityId');
    if (user.hasPermission('delegations.inCommunity', communityId)) {
      this.subscribe('delegations.inCommunity', { communityId });
    }
  });
});

Template.Main_layout.onRendered(function() {
    // Minimalize menu when screen is less than 768px
    $(window).bind("resize load", function () {
        if ($(this).width() < 769) {
            $('body').addClass('body-small')
        } else {
            $('body').removeClass('body-small')
        }
    });

     // Fix height of layout when resize, scroll and load
    $(window).bind("load resize scroll", function() {
        const windowHeight = $(window).height();
        const topbarHeight = $('nav.navbar-fixed-top').height();
        $('#page-wrapper').css("min-height", (windowHeight - topbarHeight) + "px");
    });


    // SKIN OPTIONS
    // Uncomment this if you want to have different skin option:
    // Available skin: (skin-1 or skin-3, skin-2 deprecated)
    // $('body').addClass('skin-1');

    // FIXED-SIDEBAR
    // Uncomment this if you want to have fixed left navigation
    $('body').addClass('fixed-sidebar');
    $('.sidebar-collapse').slimScroll({
        height: '100%',
        railOpacity: 0.9
    });

    // BOXED LAYOUT
    // Uncomment this if you want to have boxed layout
    // $('body').addClass('boxed-layout');
});

Template.Main_layout.helpers({
});
