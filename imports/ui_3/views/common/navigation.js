import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';
import '/imports/ui_3/views/components/badge.js';

import './navigation.html';

Template.Navigation.onCreated(function() {
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    if (activeCommunityId) {
      this.subscribe('communities.byId', { _id: activeCommunityId });
      this.subscribe('memberships.inCommunity', { communityId: activeCommunityId });
      this.subscribe('topics.list', { communityId: activeCommunityId, category: 'vote', closed: false });
      this.subscribe('topics.list', { communityId: activeCommunityId, category: 'ticket', closed: false });
    }
  });
});

Template.Navigation.onRendered(function() {
  // Initialize metisMenu
  /* new MetisMenu('#side-menu', {
    toggle: true,
    activeClass: 'active',
    collapseClass: 'collapse',
    collapseInClass: 'in',
    collapsingClass: 'collapsing',
    preventDefault: true,
  });*/
});

Template.Navigation.helpers({
  unseenEventsCount(category) {
    const communityId = Session.get('activeCommunityId');
    const userId = Meteor.userId();
    const topics = Topics.find({ communityId, category });
    let count = 0;
    topics.map(topic => {
      count += topic.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES);
    });
    return count;
  },
  needsAttentionCount(category) {
    const communityId = Session.get('activeCommunityId');
    const userId = Meteor.userId();
    const topics = Topics.find({ communityId, category });
    let count = 0;
    topics.map(topic => {
      count += topic.needsAttention(userId, Meteor.users.SEEN_BY.EYES);
    });
    return count;
  },
  countUnapprovedEntities() {
    const communityId = Session.get('activeCommunityId');
    const unapprovedParcelCount = Parcels.find({ communityId, approved: false }).count();
    const unapprovedMembershipCount = Memberships.find({ communityId, approved: false }).count();
    return unapprovedParcelCount + unapprovedMembershipCount;
  },
  developerMode() {
    return false;     // set this true to access developer features
  },
});

Template.Navigation.events({
  'click #arrow-icon'() {
    $('.navbar-static-side').removeClass('navigation-open');
  },
  'click .js-submenu-toggle'(event) {
    const submenuTitle = $(event.target).closest('a');
    submenuTitle.siblings('.nav-second-level').toggleClass('submenu-open');
    $(submenuTitle).addClass('darker-nav-bg');
    $('.nav-second-level').not(submenuTitle.siblings('.nav-second-level')).removeClass('submenu-open');
  },
  'click #side-menu>li>a:not(.js-submenu-toggle)'(event) {
    $('.nav-second-level').removeClass('submenu-open');
  },
  'transitionend .nav-second-level'(event) {
    if(!($(event.target).hasClass('submenu-open'))) {
      $(event.target).siblings('.js-submenu-toggle').removeClass('darker-nav-bg');
    }
  },
});
