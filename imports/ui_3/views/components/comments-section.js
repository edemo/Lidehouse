/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { moment } from 'meteor/momentjs:moment';
import { TimeSync } from 'meteor/mizzao:timesync';

import { onSuccess } from '/imports/ui/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { insert as insertComment, update as updateComment, remove as removeComment } from '/imports/api/comments/methods.js';
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
  'keydown .js-send-enter'(event) {
    if (event.keyCode == 13 && !event.shiftKey) {
      const textarea = event.target;
      insertComment.call({
        topicId: this._id,
        userId: Meteor.userId(),
        text: textarea.value,
      }, onSuccess(res => textarea.value = '')
      );
    }
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
  'click .js-edit'(event, instance) {
    const commentSpan = 'span[data-id="' + instance.data._id + '"]';
    $(commentSpan).attr("contenteditable","true").focus();
    $(commentSpan).toggleClass("js-send-edited");
  },
  'keydown .js-send-edited'(event, instance) {
    if (event.keyCode == 13) {
      event.preventDefault();
      const commentSpan = 'span[data-id="' + instance.data._id + '"]';
      const editedText = $(commentSpan).text();
      updateComment.call({
        commentId: instance.data._id,
        modifier: { $set: { text: editedText } },
      });
      $(commentSpan).attr("contenteditable","false");
      $(commentSpan).toggleClass("js-send-edited");
    }
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeComment, { commentId: this._id }, {
      action: 'delete comment',
      message: 'It will disappear forever',
    });
  },
});
