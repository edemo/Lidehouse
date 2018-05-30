
import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { $ } from 'meteor/jquery';

import './connection-issue.html';

const CONNECTION_ISSUE_TIMEOUT = 5000;

const showConnectionIssue = new ReactiveVar(false);

Meteor.startup(() => {
  // Only show the connection error box if it has been 5 seconds since
  // the app started
  setTimeout(() => {
    // FIXME: Launch screen handle created in lib/router.js
    // dataReadyHold.release();
    showConnectionIssue.set(true);
  }, CONNECTION_ISSUE_TIMEOUT);
});

Template.Connection_issue.onCreated(function onCreated() {
});

Template.Connection_issue.helpers({
  connected() {
    if (showConnectionIssue.get()) {
      return Meteor.status().connected;
    }
    return true;
  },
});

Template.Connection_issue.events({
  'click .theme-config-box'(event) {
    $(event.target).closest('.theme-config-box').toggleClass('show');
  },
});
