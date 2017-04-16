
import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { displayError } from '/imports/client/lib/errors.js';

import './community-main-page.html';

import './community-members-page.js';
import './community-data-page.js';

Template.Tabbed_page.onCreated(function () {
  const defaultTab = this.data.tabs[0].name;
  this.activeTab = new ReactiveVar(defaultTab);
});

Template.Tabbed_page.helpers({
  activePage() {
    return this.name + '_' + Template.instance().activeTab.get() + '_page';
  },
  isActive() {
    return Template.instance().activeTab.get() === this.name;
  },
});

Template.Tabbed_page.events({
  'click .js-tab'(event, instance) {
    instance.activeTab.set(this.name);
  },
});

Template.Community_main_page.onCreated(function () {
});

Template.Community_main_page.helpers({
  tabs() {
    return [
      { name: 'data' },
      { name: 'members' },
    ];
  },
});
