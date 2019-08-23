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
      // redundant   this.subscribe('memberships.inCommunity', { communityId: activeCommunityId });
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
  countTasks(category) {
    const communityId = Session.get('activeCommunityId');
    let count = 0;
    const topics = Topics.find({ communityId, category });
    const User = Meteor.user();
    topics.forEach(t => {
      if (User.hasPermission(`${category}.statusChangeTo.${t.status}.leave`)) count += 1;
    });
    return count;
  },
  countNotifications(category) {
    const communityId = Session.get('activeCommunityId');
    let count = 0;
    const topics = Topics.find({ communityId, category });
    topics.map(t => {
      const userId = Meteor.userId();
      count += t.needsAttention(userId, Meteor.users.SEEN_BY.EYES);
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
