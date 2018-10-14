import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import { __ } from '/imports/localization/i18n.js';
import { onSuccess, displayMessage } from '/imports/ui_3/lib/errors.js';
import { afCommunityInsertModal } from '/imports/ui_3/views/components/communities-edit.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';
import './right-sidebar.js';
import './top-navbar.html';

Template.Top_navbar.onRendered(function() {
    // FIXED TOP NAVBAR OPTION
    // Uncomment this if you want to have fixed top navbar
    $('body').addClass('fixed-nav').addClass('fixed-nav-basic');
    $(".navbar-static-top").removeClass('navbar-static-top').addClass('navbar-fixed-top');
});

Template.Top_navbar.helpers({
    userCommunities() {
        if (!Meteor.user()) { return []; }
        return Meteor.user().communities();
    },
    countNotifications(category) {
        const communityId = Session.get('activeCommunityId');
        let count = 0;
        const topics = Topics.find({ communityId, category });
        topics.map(t => {
          const userId = Meteor.userId();
          count += t.needsAttention(userId);
        });
        return count;
      },
});

Template.Top_navbar.events({
    // Toggle left navigation
    'click #navbar-minimalize'(event){
        event.preventDefault();

        // Toggle special class
        $("body").toggleClass("mini-navbar");

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
    },
    // Toggle right sidebar
    'click .right-sidebar-toggle'(){
        $('#right-sidebar').toggleClass('sidebar-open');
    },
    'click .js-switch-community'() {
        const newCommunityId = this._id;
        const newCommunity = Communities.findOne(newCommunityId);
        Session.set('activeCommunityId', newCommunityId);
        displayMessage('success', `${newCommunity.name} ${__('selected')}`);
    },
    'click .js-create-community'() {
        afCommunityInsertModal();
    },
    'click .js-logout'() {
        Meteor.logout(function onLogout(err) {
        if (err) {
    //        Alerts.add('Error logging out: '+err); // using mrt:bootstrap-alerts
        } else {
            // Session cleanup
            Object.keys(Session.keys).forEach(function unset(key) {
            Session.set(key, undefined);
            });
            Session.keys = {};
            // Redirect to the home page
            FlowRouter.go('/');
        }
        });
    },
});
