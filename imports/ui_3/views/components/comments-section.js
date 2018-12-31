/* globals document */
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';
/* globals Waypoint */

import { __ } from '/imports/localization/i18n.js';
import { displayMessage, onSuccess, handleError } from '/imports/ui_3/lib/errors.js';
import { Comments } from '/imports/api/comments/comments.js';
import { insert as insertComment, update as updateComment, remove as removeComment } from '/imports/api/comments/methods.js';
import { like } from '/imports/api/topics/likes.js';
import './comments-section.html';

Template.Comments_section.onCreated(function commentsSectionOnCreated() {
  this.autorun(() => {
    // not needed any more, we subscribe to all comments in main now
    // this.subscribe('comments.onTopic', { topicId: this.data._id });
  });
});

Template.Comments_section.onRendered(function chatboxOnRendered() {
  this.waypoint = new Waypoint({
    element: this.find('.comment-section'),
    handler() {
      const topicId = this.element.dataset.id;
      // displayMessage('info', `You just seen ${topicId}`); // debug
      Meteor.user().hasNowSeen(topicId, Meteor.users.SEEN_BY.EYES);
    },
    offset: '80%',
  });
  // Above is nicer syntax , but requires bigu:jquery-waypoints https://stackoverflow.com/questions/28975693/using-jquery-waypoints-in-meteor
  /* this.waypoint = this.$('.comment-section').waypoint(function (direction) {
    displayMessage('info', `You just seen ${this.dataset.id}`); // debug
  }, {
    offset: '80%',
  });*/
});

Template.Comments_section.onDestroyed(function chatboxOnDestroyed() {
  this.waypoint.destroy();
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
    if (event.keyCode === 13 && !event.shiftKey) {
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
    }, handleError);
  },
  'click .js-edit'(event, instance) {
    $('span[data-id="' + instance.data._id + '"]').toggleClass('hidden');
    const originalText = Comments.findOne({ _id: instance.data._id }).text;
    const textareaEdit = '<span id="editableSpan"><textarea class="form-control js-send-edited">' + 
      originalText + '</textarea>' + `<small class="text-muted">${__('commentEditInstruction')} </small></span>`;
    $(textareaEdit).insertAfter('span[data-id="' + instance.data._id + '"]');
    $('#editableSpan > textarea').focus();
  },
  'keydown .js-send-edited'(event, instance) {
    // pressing escape key
    if (event.keyCode === 27) { 
      event.preventDefault();
      $('#editableSpan').remove();
      $('span[data-id="' + instance.data._id + '"]').toggleClass('hidden');
    }
    // pressing enter key
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      const editedText = $('#editableSpan > textarea').val();
      updateComment.call({
        commentId: instance.data._id,
        modifier: { $set: { text: editedText } },
      });
      $('#editableSpan').remove();
      $('span[data-id="' + instance.data._id + '"]').toggleClass('hidden');
    }
  },
  'click .js-delete'(event, instance) {
    Modal.confirmAndCall(removeComment, { commentId: this._id }, {
      action: 'delete comment',
      message: 'It will disappear forever',
    });
  },
});
