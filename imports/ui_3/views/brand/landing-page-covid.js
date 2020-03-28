
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { $ } from 'meteor/jquery';

import './landing-page-covid.html';

Template.Landing_page_covid_19.viewmodel({
  demoUrl() {
    const lang = 'hu';
    const promo = 'covid';
    if (Meteor.settings.public.enableDemo) return FlowRouter.path('Demo login', {}, { lang, promo });
    else return `https://demo.honline.hu/demo?lang=${lang}&promo=${promo}`;
  },
});
