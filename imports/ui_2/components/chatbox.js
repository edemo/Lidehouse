import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

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
    return '16 oraja';
  },
  comments() {
    return Comments.find({ topicId: this._id }, { $sort: { createdAt: 1 } });
  },
});
