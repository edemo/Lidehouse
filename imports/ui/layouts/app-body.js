/* global alert */

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { ReactiveVar } from 'meteor/reactive-var';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Template } from 'meteor/templating';

import '../components/loading.js';
import '../components/side-panel.js';
import './app-body.html';

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

Template.App_body.onCreated(function appBodyOnCreated() {
  this.state = new ReactiveDict();
  this.state.setDefault({
    menuOpen: false,
  });

  // We run this in autorun, so when a new User logs in, the subscription changes
  this.autorun(() => {
    this.subscribe('memberships.ofUser', { userId: Meteor.userId() });
  });
  // We run this in autorun, so when User switches his community, the subscription changes
  this.autorun(() => {
    const communityId = Session.get('activeCommunity')._id;
    if (communityId) {
      this.subscribe('memberships.inCommunity', { communityId });
      this.subscribe('topics.public', { communityId });
      this.subscribe('topics.private', { communityId });
    }
  });
});

Template.App_body.helpers({
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
  templateGestures: {
    'swipeleft .cordova'(event, instance) {
      instance.state.set('menuOpen', false);
    },
    'swiperight .cordova'(event, instance) {
      instance.state.set('menuOpen', true);
    },
  },
});

Template.App_body.events({
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
});
