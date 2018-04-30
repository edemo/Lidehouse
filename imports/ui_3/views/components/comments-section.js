/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { Comments } from '/imports/api/comments/comments.js';
import { like } from '/imports/api/topics/likes.js';

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
    like.call({
      coll: 'topics',
      id: this._id,
    });
  },
});
