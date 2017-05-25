/* global alert */

import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Template } from 'meteor/templating';
import { ActiveRoute } from 'meteor/zimme:active-route';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { T9n } from 'meteor/softwarerero:accounts-t9n';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';

import '/imports/api/users/users.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Memberships } from '/imports/api/memberships/memberships.js';

import '/imports//ui/components/loading.js';
import '/imports/ui/components/side-panel.js';
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

  // We run this in autorun, so when a new User logs in, the subscription changes
  this.autorun(() => {
    this.subscribe('memberships.ofUser', { userId: Meteor.userId() });
  });
  // We run this in autorun, so when User switches his community, the subscription changes
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    if (activeCommunityId) {
      this.subscribe('memberships.inCommunity', { communityId: activeCommunityId });
    }
  });
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
  communities() {
    if (!Meteor.user()) { return []; }
    return Meteor.user().communities();
  },
  activeCommunity() {
    const activeCommunityId = Session.get('activeCommunityId');
    let activeCommunity;
    if (activeCommunityId) {
      activeCommunity = Communities.findOne(activeCommunityId);
    } else if (Meteor.user()) {
      activeCommunity = Meteor.user().communities().fetch()[0];
      Session.set('activeCommunityId', activeCommunity._id);
    }
    // else activeCommunity stays undefined

    return activeCommunity;
  },
  memberships() {
    const activeCommunityId = Session.get('activeCommunityId');
    if (!activeCommunityId) { return []; }
    return Memberships.find({ communityId: activeCommunityId, userId: Meteor.userId(), role: 'owner' });
  },
  activeMembership() {
    const activeMembershipId = Session.get('activeMembershipId');
    const activeCommunityId = Session.get('activeCommunityId');
    let activeMembership;
    if (activeMembershipId) {
      activeMembership = Memberships.findOne(activeMembershipId);
    } else if (activeCommunityId) {
      activeMembership = Memberships.findOne({ communityId: activeCommunityId, userId: Meteor.userId(), role: 'owner' });
      if (activeMembership) {
        Session.set('activeMembershipId', activeMembership._id);
      }
    }
    // else activeMembership stays undefined;

    return activeMembership;
  },
  displayMembership(membership) {
    if (!membership) return '';
    return membership.name();
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

  'click .js-switch-community'() {
    Session.set('activeCommunityId', this._id);
    Session.set('activeMembershipId', undefined);
  },

  'click .js-switch-membership'() {
    Session.set('activeMembershipId', this._id);
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
  'click .js-toggle-language'(event) {
    const language = $(event.target).html().trim();
    T9n.setLanguage(language);
    TAPi18n.setLanguage(language);
  },
});
