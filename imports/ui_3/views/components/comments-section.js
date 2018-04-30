/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { Comments } from '/imports/api/comments/comments.js';
import { Topics } from '/imports/api/topics/topics.js';

import './comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data._id });
  });
});

Template.Comments_section.helpers({
  topicId() {
    return this._id;
  },
  isVote() {
    const topic = this;
    return topic.category === 'vote';
  },
  userLikesThis() {
    const topic = this;
    return topic.isLikedBy(Meteor.userId());
  },
  comments() {
    return Comments.find({ topicId: this._id });
  },
  selfAvatar() {
    return Meteor.user().avatar;
  },
});

Template.Comment.helpers({
  avatar() {
    return this.user().avatar;
  },
  displayUser() {
    return this.user().fullName();
  },
  displayTimeSince() {
    // momentjs is not reactive, but TymeSync call makes this reactive
    const serverTimeNow = new Date(TimeSync.serverTime());
    return moment(this.createdAt).from(serverTimeNow);
  },
});

Template.Comments_section.events({
  'click .js-send-comment'(event) {
    Meteor.call('comments.insert', {
      topicId: this._id,
      userId: Meteor.userId(),
      text: document.getElementById('text_' + this._id).value,
    });
    document.getElementById('text_' + this.topicId).value = '';
  },
  'click .js-like'(event) {
    Meteor.call('like', {
      coll: 'topics',
      id: this._id,
      userId: Meteor.userId(),
    });
  },
});
