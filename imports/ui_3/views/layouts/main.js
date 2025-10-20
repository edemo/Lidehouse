import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import { ModalStack } from '/imports/ui_3/lib/modal-stack.js';
import '/imports/ui_3/views/components/context-menu.js';
import { autosetActiveCommunity } from '/imports/ui_3/lib/active-community.js';

import '../common/ibox-tools.js';
import '../common/navigation.js';
import '../common/top-navbar.js';
import '../common/live-chat.js';
import '../common/page-heading.js';
import '../common/footer.js';
import '../common/tech-chat.js';
import '../common/right-sidebar.js';
import '../common/connection-issue.js';
import '../common/promotion.js';
import './main.html';

Template.Main_layout.onCreated(function() {
  // Subscriptions
  // We run this in autorun, so when a new User logs in, the subscription changes
  this.autorun(() => {
    const userId = Meteor.userId();
    this.subscribe('memberships.ofSelf');
    autosetActiveCommunity(); // This autorun sets the active community automatically to the first community of the user
  });
  // We run this in autorun, so when User switches his community, the subscription changes
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    if (communityId) {
      this.subscribe('communities.byId', { _id: communityId });
      // this.subscribe('templates.inCommunity', { communityId });
      this.subscribe('templates.listing');  // just for the Create New Community window
      this.subscribe('sharedfolders.ofCommunity', { communityId });
      this.subscribe('agendas.inCommunity', { communityId });
      this.subscribe('parcels.codes', { communityId });
    }
  });
  this.autorun(() => {
    const communityId = ModalStack.getVar('communityId');
    const userId = Meteor.userId();
    if (communityId && userId) {
      this.subscribe('contracts.ofSelf', { communityId });
      this.subscribe('delegations.toUser', { communityId });
      this.subscribe('delegations.fromUser', { communityId });
    }
  });
  this.autorun(() => {
    const user = Meteor.userOrNull();
    const communityId = ModalStack.getVar('communityId');
    if (communityId) {
      if (user.hasPermission('delegations.inCommunity', { communityId })) {
        this.subscribe('delegations.inCommunity', { communityId });
      }
    }
  });
});

Template.Main_layout.onRendered(function() {
  let touchstartX = 0;
  let touchendX = 0;
  function swipeNavigation() {
    if (touchstartX <= 220 && touchstartX - touchendX > 70) {
      $('.navbar-static-side').removeClass('navigation-open');
    }
    if (touchstartX <= 30 && touchendX - touchstartX > 70) {
      $('.navbar-static-side').addClass('navigation-open');
    }
  }
  window.addEventListener('touchstart', function(event) {
    touchstartX = event.changedTouches[0].screenX;
  }, false);
  window.addEventListener('touchend', function(event) {
    touchendX = event.changedTouches[0].screenX;
    swipeNavigation();
  }, false); 

  const windowWith = window.matchMedia('(max-width: 768px)');
  function navbarToScreenSize(windowWidth) {
    if (windowWidth.matches) {
      $('.navbar-static-side').removeClass('navigation-open');
      $('#page-wrapper').addClass('body-resize');
      $('.navbar-fixed-top').addClass('body-resize');
      setTimeout(function() {
        $('#side-menu li a:not(a[href="#"])').addClass('toggleMiniNavbar');
        $(".toggleMiniNavbar").on('click touch', function () {
          $('.navbar-static-side').toggleClass('navigation-open');
        });
      }, 1000)
    } else {
      $('.navbar-static-side').addClass('navigation-open');
      $('.toggleMiniNavbar').off();
      $('#side-menu li a').removeClass('toggleMiniNavbar');
      $('#page-wrapper').removeClass('body-resize');
      $('.navbar-fixed-top').removeClass('body-resize');
    }
  }
  navbarToScreenSize(windowWith);
  windowWith.addListener(navbarToScreenSize);

  /*
  // Minimalize menu when screen is less than 768px
  $(window).bind("resize load", function () {
    if ($(this).width() < 769) {
      $('body').addClass('body-small');
      $('#side-menu li a').addClass('toggleMiniNavbar');
      $("#side-menu li a[href='#']").removeClass('toggleMiniNavbar');
      $(".toggleMiniNavbar").on('click touch', function () {
        $("body").toggleClass("mini-navbar");
      });
    } else {
        $('body').removeClass('body-small');
    }
  });
*/
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

  // Active state & collapse bugfixed
  /*$(window).bind("load", function() {
  // $(document).ready(function(){ <= Notice: never use in this .js => use only window-bind-load!
    $('#side-menu li').on('click touch', function() {
      $('#side-menu li').removeClass('active').filter($(this)).addClass('active');
    });
    $("#side-menu > li > a").on('click touch', function () {
      $('.nav.collapse').collapse('hide');
    });
    $("#side-menu > li > ul > li > a").on('click touch', function () {
      $(this).collapse('show');
    });
  });*/
});

Template.Main_layout.helpers({
});

Template.Main_layout.events({
  'click #wrapper'(event, instance) {
    const rightSidebar = $("#right-sidebar");
    const envelope = $(".right-sidebar-toggle");
    if (!rightSidebar.is(event.target) && rightSidebar.has(event.target).length === 0 && 
      !envelope.is(event.target) && envelope.has(event.target).length === 0) {
      rightSidebar.removeClass('sidebar-open');
    }
  },
});
