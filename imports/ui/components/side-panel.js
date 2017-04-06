/* global alert */

import { Meteor } from 'meteor/meteor';
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

import '../components/side-panel.html';

Template.Side_panel.onCreated(function sidePanelOnCreated() {
  this.subscribe('topics.public');
  this.subscribe('topics.private');
  this.subscribe('communities.listing');

  this.autorun(() => {
    // We run this is autorun, so when a new User logs in, the subscription changes
    this.subHandle = this.subscribe('members.ofUser', { userId: Meteor.userId() });
  });

  this.state = new ReactiveDict();
  this.state.setDefault({
    userMenuOpen: false,
  });

  T9n.setLanguage('hu');
  TAPi18n.setLanguage('hu');
});

Template.Side_panel.onRendered(function sidePanelOnRendered() {
  this.autorun(() => {
    if (this.subHandle.ready()) {
      const communityId = Members.findOne({ }).communityId;
      this.subscribe('members.inCommunity', { communityId });
    }
  });
});

Template.Side_panel.helpers({
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
  languages() {
    return _.keys(TAPi18n.getLanguages()).reverse();
  },
  isActiveLanguage(language) {
    return (TAPi18n.getLanguage() === language);
  },
});

Template.Side_panel.events({

  'click .js-user-menu'(event, instance) {
    instance.state.set('userMenuOpen', !instance.state.get('userMenuOpen'));
    // stop the menu from closing
    event.stopImmediatePropagation();
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
