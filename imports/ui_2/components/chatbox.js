import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TAPi18n } from 'meteor/tap:i18n';

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
  displaySince() {
    return moment(this.createdAt).fromNow();
  },
  comments() {
    return Comments.find({ topicId: this._id }, { $sort: { createdAt: 1 } });
  },
});
