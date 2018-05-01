/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { onSuccess } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { insert as insertComment } from '/imports/api/comments/methods.js';
import { like } from '/imports/api/topics/likes.js';
import './comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
  this.autorun(() => {
    this.subscribe('comments.onTopic', { topicId: this.data._id });
  });
});

Template.Comments_section.helpers({
  isVote() {
    const topic = this;
    return topic.category === 'vote';
  },
  comments() {
    return Comments.find({ topicId: this._id });
  },
});

Template.Comments_section.events({
  'keyup .js-send-enter'(event) {
    if (event.keyCode !== 13) return;
    const textarea = event.target;
    insertComment.call({
      topicId: this._id,
      userId: Meteor.userId(),
      text: textarea.value,
    }, onSuccess(res => textarea.value = '')
    );
  },
});

//------------------------------------

Template.Comment.helpers({
});

Template.Comment.events({
  'click .js-like'(event) {
    like.call({
      coll: 'comments',
      id: this._id,
    });
  },
});
