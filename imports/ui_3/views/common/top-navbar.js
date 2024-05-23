import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import { Settings } from '/imports/api/settings/settings';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { Communities } from '/imports/api/communities/communities.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import '/imports/api/communities/actions.js';
import { Topics } from '/imports/api/topics/topics.js';
import { resetSession } from '/imports/startup/client/session.js';
import '/imports/api/users/users.js';
import '/imports/ui_3/views/components/badge.js';
import './right-sidebar.js';
import './top-navbar.html';

function communityNameAdjust() {
  const navbarWidth = $('.navbar-fixed-top').width();
  const menuIcon = $('.navbar-header').outerWidth(true);
  let otherElements = 0;
  $('.navbar-top-links > li').not(':first').each(function () {
    otherElements += $(this).outerWidth(true);
  });
  const paddingsandCaret = 40;
  const maxCommunityName = navbarWidth - menuIcon - otherElements - paddingsandCaret;
  $('#active-community-name').css('max-width', maxCommunityName + 'px');
}

Template.Top_navbar.onRendered(function() {
  // FIXED TOP NAVBAR OPTION
  // Uncomment this if you want to have fixed top navbar
  $('body').addClass('fixed-nav').addClass('fixed-nav-basic');
  $(".navbar-static-top").removeClass('navbar-static-top').addClass('navbar-fixed-top');
  Meteor.setTimeout(communityNameAdjust, 1000);
  $(window).on("load resize", function() {
    communityNameAdjust();    
  });
});

Template.Top_navbar.onDestroyed(function() {
  // FIXED TOP NAVBAR OPTION
  // Uncomment this if you want to have fixed top navbar
  $('body').removeClass('fixed-nav').removeClass('fixed-nav-basic');
  $(window).off("load resize", function() {
    communityNameAdjust();      
  });
});

Template.Top_navbar.onDestroyed(function() {
  $('body').removeClass('fixed-nav').removeClass('fixed-nav-basic');
});

Template.Top_navbar.helpers({
  community() {
    return getActiveCommunity() || { displayType: () => 'community' };
  },
  userCommunities() {
    if (!Meteor.user()) { return []; }
    return Meteor.user().communities();
  },
  superCommunities() {
    if (!Meteor.user()?.super) { return undefined; }
    return Communities.find({}).fetch();
  },
  notiCount(communityId) {
    const userId = Meteor.userId();
    const topics = Topics.find({ communityId });
    let count = 0;
    topics.forEach(topic => {
      count += topic.hasThingsToDisplayFor(userId, Meteor.users.SEEN_BY.EYES);
    });
    return count;
  },
  unseenEventsCount(roomTitle) {
    const communityId = ModalStack.getVar('communityId');
    const userId = Meteor.userId();
    const rooms = Topics.find({ communityId, category: 'room', title: roomTitle });
    let count = 0;
    const correspondents = [];
    rooms.map(room => {
      const unseenCommentsCount = room.unseenCommentCountBy(userId, Meteor.users.SEEN_BY.EYES);
      count += unseenCommentsCount;
      if (unseenCommentsCount > 0) {
        const otherUserId = room.participantIds.find(id => id !== userId);
        const otherUserName = Meteor.users.findOne(otherUserId)?.displayOfficialName();
        correspondents.push(otherUserName);
      }
    });
    return { count, correspondents };
  },
  nameMismatchCounter() {
    return Meteor.user().personNameMismatch() ? 1 : 0;
  },
  nameMismatchSeriousity() {
    const nameMismatch = Meteor.user().personNameMismatch();
    if (nameMismatch === 'different') return 'danger';
    // 'analog' is suspended at user.personNameMismatch()
    // if (nameMismatch === 'analog') return 'info';  
    return;
  },
});

Template.Top_navbar.events({
  // Toggle left navigation
  'click #navbar-minimalize'(event){
    event.preventDefault();
    $('.navbar-static-side').toggleClass('navigation-open');
    if (window.matchMedia('(min-width: 769px)').matches) {
      $('#page-wrapper').toggleClass('body-resize');
      $('.navbar').toggleClass('body-resize');
    }

/* Original menu animation by theme
      // Enable smoothly hide/show menu
      if (!$('body').hasClass('mini-navbar') || $('body').hasClass('body-small')) {
          // Hide menu in order to smoothly turn on when maximize menu
          $('#side-menu').hide();
          // For smoothly turn on menu
          setTimeout(
              function () {
                  $('#side-menu').fadeIn(400);
              }, 200);
      } else if ($('body').hasClass('fixed-sidebar')) {
          $('#side-menu').hide();
          setTimeout(
              function () {
                  $('#side-menu').fadeIn(400);
              }, 100);
      } else {
          // Remove all inline style from jquery fadeIn function to reset menu state
          $('#side-menu').removeAttr('style');
      }
*/
  },
  // Toggle right sidebar
  'click .right-sidebar-toggle'() {
    $('#right-sidebar').toggleClass('sidebar-open');
    if (window.matchMedia('(max-width: 768px)').matches) {
      $('.navbar-static-side').removeClass('navigation-open');
    }
  },
  'click #privatechat'() {
    Session.set('roomMode', 'private chat');
  },
  'click #techsupport'() {
    Session.set('roomMode', 'tech support');
  },
  'click .js-switch-community'() {
    const newCommunityId = this._id;
    const newCommunity = this;
    ModalStack.setVar('communityId', newCommunityId, true);
    displayMessage('success', `${newCommunity.name} ${__('selected')}`);
    const user = Meteor.user();
    const communities = user.communities();
    if (communities.count() > 1) Settings.set('activeCommunityId', newCommunityId);
  },
  'click .js-create.community'() {
    Communities.actions.create().run();
  },
  'click .js-logout'() {
    Meteor.logout(function onLogout(err) {
      if (err) {
    //        Alerts.add('Error logging out: '+err); // using mrt:bootstrap-alerts
      } else {
        resetSession();
        // Redirect to the home page
        FlowRouter.go('/');
      }
    });
  },
});
