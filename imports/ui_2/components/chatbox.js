import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { Comments } from '/imports/api/comments/comments.js';

import '../components/chatbox.html';
import '../components/comments-section.js';

Template.Chatbox.onRendered(function chatboxOnRendered() {
});

Template.Chatbox.helpers({
  avatar() {
    return Meteor.users.findOne(this.userId).avatar;
  },
  displayUser() {
    return Meteor.users.findOne(this.userId).fullName();
  },
  displayTimeSince() {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(this.createdAt).from(serverTimeNow);
  },
  comments() {
    return Comments.find({ topicId: this._id }, { sort: { createdAt: 1 } });
  },
});
