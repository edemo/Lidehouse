/* global alert */

import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Template } from 'meteor/templating';
import { ActiveRoute } from 'meteor/zimme:active-route';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import '../../ui/components/loading.js';
import '../../ui/components/side-panel.js';
import './custom-body.html';

const CONNECTION_ISSUE_TIMEOUT = 5000;

// A store which is local to this file?
const showConnectionIssue = new ReactiveVar(false);

Meteor.startup(() => {
  // Only show the connection error box if it has been 5 seconds since
  // the app started
  setTimeout(() => {
    // FIXME:
    // Launch screen handle created in lib/router.js
    // dataReadyHold.release();

    // Show the connection error box
    showConnectionIssue.set(true);
  }, CONNECTION_ISSUE_TIMEOUT);
});

Template.Custom_body.onCreated(function customBodyOnCreated() {
  this.state = new ReactiveDict();
  this.state.setDefault({
    menuOpen: false,
  });
  T9n.setLanguage('hu');
  TAPi18n.setLanguage('hu');
});

Template.Custom_body.helpers({
  menuOpen() {
    const instance = Template.instance();
    return instance.state.get('menuOpen') && 'menu-open';
  },
  cordova() {
    return Meteor.isCordova && 'cordova';
  },
  connected() {
    if (showConnectionIssue.get()) {
      return Meteor.status().connected;
    }

    return true;
  },
  languages() {
    return _.keys(TAPi18n.getLanguages()).reverse();
  },
  isActiveLanguage(language) {
    return (TAPi18n.getLanguage() === language);
  },
  templateGestures: {
    'swipeleft .cordova'(event, instance) {
      instance.state.set('menuOpen', false);
    },
    'swiperight .cordova'(event, instance) {
      instance.state.set('menuOpen', true);
    },
  },
});

Template.Custom_body.events({
  'click .js-menu'(event, instance) {
    instance.state.set('menuOpen', !instance.state.get('menuOpen'));
  },

  'click .content-overlay'(event, instance) {
    instance.state.set('menuOpen', false);
    event.preventDefault();
  },

  'click #menu a'(event, instance) {
    instance.state.set('menuOpen', false);
  },
  'click .js-logout'() {
    Meteor.logout();
  },
  'click .js-toggle-language'(event) {
    const language = $(event.target).html().trim();
    T9n.setLanguage(language);
    TAPi18n.setLanguage(language);
  },
});
