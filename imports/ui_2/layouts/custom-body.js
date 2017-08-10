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
import { Parcels } from '/imports/api/parcels/parcels.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Topics } from '/imports/api/topics/topics.js';
import { feedbacksSchema } from '/imports/api/topics/feedbacks/feedbacks.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { displayError, displayMessage } from '/imports/ui/lib/errors.js';

import '/imports/ui/components/loading.js';
import '/imports/ui/components/side-panel.js';
import '/imports/ui_2/pages/not-logged-in.html';
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

  // We run this in autorun, so when a new User logs in, the subscription changes
  this.autorun(() => {
    this.subscribe('memberships.ofUser', { userId: Meteor.userId() });
  });
  // This autorun sets the active community automatically to the first community of the user
  // TODO: active community could be saved somewhere so he gets back where he left off last time
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    const user = Meteor.user();
    if (!activeCommunityId && user) {
      const communities = user.communities();
      if (communities.count() > 0) {
        const activeCommunity = communities.fetch()[0];
        Session.set('activeCommunityId', activeCommunity._id);
      }
    }
  });
  // We run this in autorun, so when User switches his community, the subscription changes
  this.autorun(() => {
    const activeCommunityId = Session.get('activeCommunityId');
    if (activeCommunityId) {
      this.subscribe('parcels.inCommunity', { communityId: activeCommunityId });
      this.subscribe('memberships.inCommunity', { communityId: activeCommunityId });
    }
  });
  // This autorun sets the active membership automatically to the first membership of the user in the community
  // TODO: active membership could be saved somewhere so he gets back where he left off last time
  this.autorun(() => {
    const activeMembershipId = Session.get('activeMembershipId');
    const activeCommunityId = Session.get('activeCommunityId');
    if (!activeMembershipId && activeCommunityId && Meteor.userId()) {
      const activeMembership = Memberships.findOne({ communityId: activeCommunityId, userId: Meteor.userId() });
      if (activeMembership) {
        Session.set('activeMembershipId', activeMembership._id);
      }
    }
  });
});

Template.Custom_body.helpers({
  menuOpen() {
    const instance = Template.instance();
    return instance.state.get('menuOpen') && 'menu-open';
  },
  feedbackClosed() {
    const instance = Template.instance();
    return instance.state.get('feedbackClosed') && 'feedback-closed';
  },
  feedbackCollection() {
    return Topics;
  },
  feedbackInsertSchema() {
    return feedbacksSchema;
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
    const activeCommunity = activeCommunityId ? Communities.findOne(activeCommunityId) : undefined;
    return activeCommunity;
  },
  memberships() {
    const activeCommunityId = Session.get('activeCommunityId');
    if (!activeCommunityId) { return []; }
//    const parcels = Parcels.find({ communityId: activeCommunityId });
    return Memberships.find({ communityId: activeCommunityId, userId: Meteor.userId() });
  },
  activeMembership() {
    const activeMembershipId = Session.get('activeMembershipId');
    const activeMembership = activeMembershipId ? Memberships.findOne(activeMembershipId) : undefined;
    return activeMembership;
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
  'click .js-feedback-close'(event, instance) {
    instance.state.set('feedbackClosed', !instance.state.get('feedbackClosed'));
  },
});

AutoForm.addHooks('af.feedback', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    doc.userId = Meteor.userId();
    doc.category = 'feedback';
    doc.title = doc.text ? doc.text.substring(0, 100) : '';
//    if (!doc.feedback) doc.feedback = {};
    return doc;
  },
  onError(formType, error) {
    displayError(error);
  },
  onSuccess(formType, result) {
    displayMessage('success', 'Feedback appreciated');
  },
});
