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

import { Topics } from '../../api/topics/topics.js';
import { insert as insertTopic } from '../../api/topics/methods.js';
import { Communities } from '../../api/communities/communities.js';
import { Members } from '../../api/members/members.js';
import { insert as insertMember } from '../../api/members/methods.js';

import '../components/loading.js';
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
  this.subscribe('topics.public');
  this.subscribe('topics.private');
  this.subscribe('communities.listing');
  this.subscribe('members.inCommunity');

  this.state = new ReactiveDict();
  this.state.setDefault({
    menuOpen: false,
    userMenuOpen: false,
  });

  T9n.setLanguage('hu');
  TAPi18n.setLanguage('hu');
});

Template.App_body.helpers({
  menuOpen() {
    const instance = Template.instance();
    return instance.state.get('menuOpen') && 'menu-open';
  },
  cordova() {
    return Meteor.isCordova && 'cordova';
  },
  emailLocalPart() {
    const email = Meteor.user().emails[0].address;
    return email.substring(0, email.indexOf('@'));
  },
  userMenuOpen() {
    const instance = Template.instance();
    return instance.state.get('userMenuOpen');
  },
  topics() {
    return Topics.find({ $or: [
      { userId: { $exists: false } },
      { userId: Meteor.userId() },
    ] });
  },
  activeTopicClass(topic) {
    const active = ActiveRoute.name('Topics.show')
      && FlowRouter.getParam('_id') === topic._id;

    return active && 'active';
  },
  communities() {
    return Communities.find({});
  },
  members() {
    return Members.find({});
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
  languages() {
    return _.keys(TAPi18n.getLanguages()).reverse();
  },
  isActiveLanguage(language) {
    return (TAPi18n.getLanguage() === language);
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

  'click .js-user-menu'(event, instance) {
    instance.state.set('userMenuOpen', !instance.state.get('userMenuOpen'));
    // stop the menu from closing
    event.stopImmediatePropagation();
  },

  'click #menu a'(event, instance) {
    instance.state.set('menuOpen', false);
  },

  'click .js-logout'() {
    Meteor.logout();

    // if we are on a private topic, we'll need to go to a public one
    if (ActiveRoute.name('Topics.show')) {
      // TODO -- test this code path
      const topic = Topics.findOne(FlowRouter.getParam('_id'));
      if (topic.userId) {
        FlowRouter.go('Topics.show', Topics.findOne({ userId: { $exists: false } }));
      }
    }
  },

  'click .js-new-topic'() {
    const topicId = insertTopic.call({ language: TAPi18n.getLanguage() }, (err) => {
      if (err) {
        // At this point, we have already redirected to the new topic page, but
        // for some reason the topic didn't get created. This should almost never
        // happen, but it's good to handle it anyway.
        FlowRouter.go('App.home');
        alert("#{TAPi18n.__('layouts.appBody.newTopicError')}\n#{err}"); // eslint-disable-line no-alert
      }
    });

    FlowRouter.go('Topics.show', { _id: topicId });
  },

  'click .js-new-member'() {
    insertMember.call({ userId: Meteor.userId() }, (err) => {
      if (err) {
        FlowRouter.go('App.home');
        alert("#{TAPi18n.__('layouts.appBody.newMemberError')}\n#{err}"); // eslint-disable-line no-alert
      }
    });
  },

  'click .js-toggle-language'(event) {
    const language = $(event.target).html().trim();
    T9n.setLanguage(language);
    TAPi18n.setLanguage(language);
  },
});
