import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { $ } from 'meteor/jquery';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { Accounts } from 'meteor/accounts-base';
import { __ } from '/imports/localization/i18n.js';
import { displayError } from '/imports/ui/lib/errors.js';
import '/imports/api/demohouse.js';
import './intro-page.html';


Template.Intro_page.onRendered(function(){

    $('body').addClass('landing-page');
    $('body').removeClass('fixed-nav').removeClass('fixed-nav-basic');  // added by the main navbar
    $('body').attr('id', 'page-top');
    $('body').scrollspy({
        target: '.navbar-fixed-top',
        offset: 80
    });

    // Page scrolling feature
    $('a.page-scroll').bind('click', function(event) {
        var link = $(this);
        $('html, body').stop().animate({
            scrollTop: $(link.attr('href')).offset().top - 50
        }, 500);
        event.preventDefault();
        $("#navbar").collapse('hide');
    });

    var cbpAnimatedHeader = (function() {
        var docElem = document.documentElement,
            header = document.querySelector( '.navbar-default' ),
            didScroll = false,
            changeHeaderOn = 200;
        function init() {
            window.addEventListener( 'scroll', function( event ) {
                if( !didScroll ) {
                    didScroll = true;
                    setTimeout( scrollPage, 250 );
                }
            }, false );
        }
        function scrollPage() {
            var sy = scrollY();
            if ( sy >= changeHeaderOn ) {
                $(header).addClass('navbar-scroll')
            }
            else {
                $(header).removeClass('navbar-scroll')
            }
            didScroll = false;
        }
        function scrollY() {
            return window.pageYOffset || docElem.scrollTop;
        }
        init();

    })();

    // Activate WOW.js plugin for animation on scroll
    //new WOW().init();

});

Template.Intro_page.onDestroyed(function() {
    $('body').removeClass('landing-page');
});

Template.Intro_page.events({
  'click .read-more'(event) {
    event.preventDefault();
    $(event.target).closest('div').find('.more-text').show();
    $(event.target).closest('p').hide();
  },

  'click .demouser-autologin'() {
    Meteor.call('createDemoUserWithParcel', function (error, result) {
      if (error) displayError(error);
      else {
        Meteor.loginWithPassword(result, 'password', function (error) {
          if (error) displayError(error);
          else FlowRouter.go('App.home');
        });
      }
    });
  },
});
