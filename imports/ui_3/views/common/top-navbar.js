import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';
import { afCommunityInsertModal } from '/imports/ui_2/pages/communities-edit.js';

import './top-navbar.html';

Template.Top_navbar.onRendered(function() {
    // FIXED TOP NAVBAR OPTION
    // Uncomment this if you want to have fixed top navbar
    $('body').addClass('fixed-nav').addClass('fixed-nav-basic');;
    $(".navbar-static-top").removeClass('navbar-static-top').addClass('navbar-fixed-top');
});

Template.Top_navbar.events({
    // Toggle left navigation
    'click #navbar-minimalize'(event) {
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
    'click .js-switch-community'() {
        Session.set('activeCommunityId', this._id);
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
