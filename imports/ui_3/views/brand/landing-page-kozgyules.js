import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';
import './landing-page-kozgyules.html';

Template.Landing_page_kozgyules.onRendered(function(){
  $('body').addClass('landing-page');
});

Template.Landing_page_kozgyules.onDestroyed(function() {
  $('body').removeClass('landing-page');
});

Template.Landing_page_kozgyules.helpers({
  currentYear() {
    return (new Date()).getFullYear();
  },
  demoUrl() {
    const lang = 'hu';
    const promo = 'covid';
    if (Meteor.settings.public.enableDemo) return FlowRouter.path('Demo login', {}, { lang, promo });
    else return `https://demo.honline.hu/demo?lang=${lang}&promo=${promo}`;
  },
});

Template.Landing_page_kozgyules.events({
});
