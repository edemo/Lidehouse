/* globals fbq */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import './landing-page-covid.html';

Template.Landing_page_covid.onRendered(function onRendered() {
  $('body').addClass('landing-page');
});

Template.Landing_page_covid.onDestroyed(function onDestroyed() {
  $('body').removeClass('landing-page');
});

Template.Landing_page_covid.helpers({
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

Template.Landing_page_covid.events({
  'click .call-to-action'(event) {
    if (fbq) fbq('track', 'Lead');
  },
});
